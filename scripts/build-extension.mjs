// Bundles the in-editor runtime and packages it as an installable .eext file.
import { build } from 'esbuild';
import { zipSync, strToU8 } from 'fflate';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(root, 'extension');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

await build({
	entryPoints: [join(ext, 'src/index.ts')],
	bundle: true,
	platform: 'browser',
	format: 'iife',
	globalName: 'edaEsbuildExportName',
	target: 'es2019',
	minify: true,
	outfile: join(ext, 'dist/index.js'),
	logLevel: 'warning',
});

const manifest = JSON.parse(readFileSync(join(ext, 'extension.json'), 'utf8'));
const files = {
	'extension.json': strToU8(JSON.stringify(manifest, null, '\t')),
	'dist/index.js': readFileSync(join(ext, 'dist/index.js')),
	'README.md': strToU8('# EasyEDA MCP\n\nInstall, then enable **External Interaction** for this extension in the Extension Manager.\n'),
};
if (existsSync(join(ext, 'images/logo.png'))) files['images/logo.png'] = readFileSync(join(ext, 'images/logo.png'));
mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'easyeda-mcp.eext');
writeFileSync(out, zipSync(files, { level: 9 }));
console.log('extension packaged:', out, '(runtime', manifest.version + ')');
