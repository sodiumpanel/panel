import { spawn } from 'child_process';

const watch = spawn('node', ['src/bundler/build.js', 'dev'], { stdio: 'inherit' });
const server = spawn('node', ['src/server/index.js'], { stdio: 'inherit' });

const kill = () => {
  watch.kill();
  server.kill();
  process.exit();
};

process.on('SIGINT', kill);
process.on('SIGTERM', kill);
