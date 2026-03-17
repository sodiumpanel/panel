import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.resolve('.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'rollup-cache.json');

export function loadCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return undefined;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    return data;
  } catch {
    return undefined;
  }
}

export function saveCache(cache) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const serializable = {
      modules: cache.modules.map(m => ({
        id: m.id,
        code: m.code,
        ast: m.ast,
        dependencies: m.dependencies,
        transformDependencies: m.transformDependencies,
        syntheticNamedExports: m.syntheticNamedExports,
        meta: m.meta,
      }))
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(serializable));
  } catch {}
}

export function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  } catch {}
}
