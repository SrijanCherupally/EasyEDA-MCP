import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('test').filter((f) => f.endsWith('.test.ts')).map((f) => 'test/' + f);
await build({ entryPoints: files, outdir: '.test-dist', bundle: true, platform: 'node', format: 'esm', target: 'node20', packages: 'external', loader: { '.edajs': 'text' }, outExtension: { '.js': '.mjs' }, logLevel: 'warning' });
const r = spawnSync(process.execPath, ['--test', ...files.map((f) => '.test-dist/' + f.slice(5).replace(/\.ts$/, '.mjs'))], { stdio: 'inherit' });
process.exit(r.status ?? 1);
