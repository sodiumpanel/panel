import { rollup, watch as rollupWatch } from '@rollup/wasm-node';
import { spawn } from 'child_process';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import htmlPlugin from './html-plugin.js';
import { buildVendor, vendorExternals, vendorGlobals } from './vendor.js';
import logger from '../server/utils/logger.js';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2).map(a => a.toLowerCase());
const mode = args[0] || 'prod';

const MODES = {
  dev: { minify: false, treeshake: false, watch: true, server: true },
  watch: { minify: false, treeshake: false, watch: true, server: false },
  fast: { minify: false, treeshake: false, watch: false, server: false },
  prod: { minify: true, treeshake: true, watch: false, server: false }
};

const config = MODES[mode] || MODES.prod;
const input = 'src/main.js';
const outDir = path.resolve('dist');

function progressPlugin() {
  const ESTIMATED_MODULES = 50;
  let processed = 0;
  let startTime = 0;
  
  const showProgress = (percent, phase) => {
    const p = Math.min(percent, 100);
    const filled = Math.floor(p / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    process.stdout.write(`\r  ${bar} ${p}% ${phase}`);
  };
  
  return {
    name: 'progress',
    
    buildStart() {
      processed = 0;
      startTime = Date.now();
      showProgress(0, 'Starting...');
    },
    
    transform() {
      processed++;
      const percent = Math.round((processed / ESTIMATED_MODULES) * 80);
      showProgress(percent, 'Compiling...');
      return null;
    },
    
    generateBundle() {
      showProgress(85, 'Generating...');
    },
    
    writeBundle() {
      showProgress(95, 'Writing...  ');
    },
    
    closeBundle() {
      showProgress(100, 'Done!       ');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r  ████████████████████ 100% Done in ${elapsed}s\n`);
    }
  };
}

function getPlugins() {
  const plugins = [
    resolve({ 
      browser: true, 
      extensions: ['.js'],
      preferBuiltins: false
    }),
    commonjs({ sourceMap: false }),
    json(),
    postcss({
      extensions: ['.css', '.scss'],
      extract: 'main.css',
      minimize: config.minify,
      sourceMap: false,
      use: {
        sass: { silenceDeprecations: ['legacy-js-api', 'import'] }
      },
      plugins: [autoprefixer()]
    }),
    htmlPlugin({
      template: 'src/templates/index.html',
      filename: 'main.html',
      vendorScript: '/vendor.js'
    })
  ];
  
  if (!config.watch) {
    plugins.push(progressPlugin());
  }
  
  if (config.minify) {
    plugins.push(terser({
      maxWorkers: 1,
      format: { comments: false },
      compress: { passes: 2 }
    }));
  }
  
  return plugins;
}

const buildConfig = {
  input,
  plugins: getPlugins(),
  external: vendorExternals(),
  output: {
    dir: outDir,
    format: 'iife',
    name: 'Sodium',
    globals: vendorGlobals(),
    indent: false,
    sourcemap: false,
    compact: config.minify
  },
  treeshake: config.treeshake,
  onwarn(warning, warn) {
    if (warning.code === 'FILE_NAME_CONFLICT') return;
    if (warning.plugin === 'postcss' && warning.message.includes('deprecation')) return;
    warn(warning);
  }
};

function formatError(err) {
  const file = err.loc?.file || err.id || 'unknown';
  const line = err.loc?.line || err.line || '-';
  const message = err.message || String(err);
  
  logger.error(`${path.basename(file)}:${line}`);
  logger.error(message);
}

function getOutputStats() {
  try {
    const files = fs.readdirSync(outDir);
    const js = files.filter(f => f.endsWith('.js')).length;
    const css = files.filter(f => f.endsWith('.css')).length;
    const html = files.filter(f => f.endsWith('.html')).length;
    return { js, css, html };
  } catch {
    return null;
  }
}

async function build() {
  console.log('');
  logger.info(`Build mode: ${mode}`);
  
  await buildVendor(config.minify);
  
  try {
    const bundle = await rollup(buildConfig);
    await bundle.write(buildConfig.output);
    await bundle.close();
    
    const stats = getOutputStats();
    if (stats) {
      logger.info(`Output: ${stats.js} JS, ${stats.css} CSS, ${stats.html} HTML`);
    }
    
    process.exit(0);
  } catch (err) {
    formatError(err);
    process.exit(1);
  }
}

async function watch() {
  await buildVendor(false);
  
  logger.info(`Watching for changes (${mode})...`);
  
  const watcher = rollupWatch({
    ...buildConfig,
    watch: {
      exclude: ['node_modules/**'],
      chokidar: {
        ignoreInitial: true,
        ignorePermissionErrors: true,
        usePolling: false
      },
      clearScreen: false,
      buildDelay: 50
    }
  });
  
  watcher.on('event', event => {
    switch (event.code) {
      case 'START':
        break;
        
      case 'BUNDLE_START':
        logger.info('Rebuilding...');
        break;
        
      case 'BUNDLE_END':
        logger.success(`Done in ${event.duration}ms`);
        event.result?.close();
        break;
        
      case 'ERROR':
      case 'FATAL':
        formatError(event.error);
        break;
    }
  });
  
  const cleanup = async () => {
    logger.info('Stopping watcher...');
    await watcher.close();
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function dev() {
  logger.startup('dev');
  console.log('');
  
  const watchProc = spawn('node', ['src/bundler/index.js', 'watch'], { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  const serverProc = spawn('node', ['src/server/index.js'], { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  const cleanup = () => {
    watchProc.kill();
    serverProc.kill();
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  watchProc.on('error', err => logger.error(`Watch: ${err.message}`));
  serverProc.on('error', err => logger.error(`Server: ${err.message}`));
}

switch (mode) {
  case 'dev':
    dev();
    break;
  case 'watch':
    watch();
    break;
  case 'fast':
  case 'prod':
  default:
    build();
    break;
}
