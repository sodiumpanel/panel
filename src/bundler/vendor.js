import { rollup } from '@rollup/wasm-node';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import logger from '../server/utils/logger.js';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve('.cache');
const VENDOR_META = path.join(CACHE_DIR, 'vendor-meta.json');
const VENDOR_OUT = path.resolve('dist', 'vendor.js');

const SERVER_ONLY = new Set([
  'express', 'helmet', 'cookie-parser', 'jsonwebtoken',
  'bcryptjs', 'nodemailer', 'redis', 'ws', 'tar',
  'satori', '@resvg/resvg-wasm', 'bytes'
]);

function scanVendorPackages() {
  const srcDir = path.resolve('src');
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  const allDeps = new Set([
    ...Object.keys(pkgJson.dependencies || {}),
    ...Object.keys(pkgJson.devDependencies || {})
  ]);
  
  function isInstalled(pkg) {
    try {
      const p = path.resolve('node_modules', pkg, 'package.json');
      fs.accessSync(p);
      return true;
    } catch { return false; }
  }

  const found = new Set();
  const importRe = /(?:import|export)\s+(?:.*?from\s+)?['"]([^./][^'"]*)['"]/g;
  
  function scanDir(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'bundler') continue;
        if (full === path.resolve('src/server')) continue;
        scanDir(full);
      } else if (entry.name.endsWith('.js')) {
        try {
          const code = fs.readFileSync(full, 'utf8');
          let m;
          importRe.lastIndex = 0;
          while ((m = importRe.exec(code)) !== null) {
            let pkg = m[1];
            if (pkg.startsWith('@')) {
              pkg = pkg.split('/').slice(0, 2).join('/');
            } else {
              pkg = pkg.split('/')[0];
            }
            if (!SERVER_ONLY.has(pkg) && (allDeps.has(pkg) || isInstalled(pkg))) {
              found.add(pkg);
            }
          }
        } catch {}
      }
    }
  }

  scanDir(srcDir);
  return [...found].sort();
}

let _vendorPackages = null;
export function getVendorPackages() {
  if (!_vendorPackages) _vendorPackages = scanVendorPackages();
  return _vendorPackages;
}

function safeId(pkg) {
  return pkg.replace(/[@/\-\.]/g, '_');
}

function globalName(pkg) {
  return '__vendor_' + safeId(pkg);
}

function getPackageVersions() {
  const versions = {};
  for (const pkg of getVendorPackages()) {
    try {
      const pkgPath = path.resolve('node_modules', pkg, 'package.json');
      const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      versions[pkg] = data.version;
    } catch {
      versions[pkg] = 'unknown';
    }
  }
  return versions;
}

export function isVendorCurrent() {
  try {
    if (!fs.existsSync(VENDOR_OUT) || !fs.existsSync(VENDOR_META)) return false;
    const meta = JSON.parse(fs.readFileSync(VENDOR_META, 'utf8'));
    const current = getPackageVersions();
    return JSON.stringify(meta.versions) === JSON.stringify(current);
  } catch {
    return false;
  }
}

export async function buildVendor(minify = false) {
  if (isVendorCurrent()) {
    logger.info('Vendor bundle up to date');
    return;
  }

  logger.info('Pre-bundling vendor dependencies...');
  const t = Date.now();

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(VENDOR_OUT), { recursive: true });

  const entryFile = path.join(CACHE_DIR, '_vendor_entry.js');
  const packages = getVendorPackages();
  logger.info(`Found ${packages.length} vendor packages`);
  
  const lines = packages.map(pkg =>
    `import * as ${safeId(pkg)} from '${pkg}';\nwindow.${globalName(pkg)} = ${safeId(pkg)};`
  );
  fs.writeFileSync(entryFile, lines.join('\n'));

  const plugins = [
    resolve({ browser: true, extensions: ['.js'], preferBuiltins: false }),
    commonjs({ sourceMap: false }),
    json(),
  ];

  if (minify) {
    plugins.push(terser({
      maxWorkers: 1,
      format: { comments: false },
      compress: { passes: 1 }
    }));
  }

  const bundle = await rollup({
    input: entryFile,
    plugins,
    treeshake: false,
    onwarn() {}
  });

  await bundle.write({
    file: VENDOR_OUT,
    format: 'iife',
    name: '__sodium_vendor',
    sourcemap: false,
    compact: minify
  });
  await bundle.close();

  fs.writeFileSync(VENDOR_META, JSON.stringify({
    versions: getPackageVersions(),
    built: new Date().toISOString(),
    minified: minify
  }, null, 2));

  try { fs.unlinkSync(entryFile); } catch {}

  const size = (fs.statSync(VENDOR_OUT).size / 1024).toFixed(0);
  const elapsed = ((Date.now() - t) / 1000).toFixed(1);
  logger.info(`Vendor: ${size}k in ${elapsed}s`);
}

export function vendorExternals() {
  return getVendorPackages();
}

export function vendorGlobals() {
  const globals = {};
  for (const pkg of getVendorPackages()) {
    globals[pkg] = globalName(pkg);
  }
  return globals;
}
