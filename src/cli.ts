#!/usr/bin/env node
/* Developer / power-user CLI: `easyeda-mcp-cli status | exec <file.js|code> [jsonArgs] | info` */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { HubClient } from './client.js';
import { EDA_LIBRARY } from './eda/library.js';

const [cmd, a1, a2] = process.argv.slice(2);
const c = new HubClient('cli');
c.setLibrary(EDA_LIBRARY);
const out = (x: any) => process.stdout.write((typeof x === 'string' ? x : JSON.stringify(x, null, 1)) + '\n');
try {
	if (cmd === 'status') out(await c.status());
	else if (cmd === 'info') out(await c.info());
	else if (cmd === 'exec' || cmd === 'raw') {
		const code = a1 && existsSync(a1) ? readFileSync(a1, 'utf8') : a1;
		const r = await c.exec(code, a2 ? JSON.parse(existsSync(a2) ? readFileSync(a2, 'utf8') : a2) : {}, { timeoutMs: Number(process.env.EASYEDA_TIMEOUT || 45000), raw: cmd === 'raw' });
		if (r.logs.length) out('LOGS:\n' + r.logs.join('\n'));
		// Save blobs to files when asked via EASYEDA_SAVE_BLOBS=dir
		const res: any = r.result;
		if (res && res.__blob && process.env.EASYEDA_SAVE) {
			writeFileSync(process.env.EASYEDA_SAVE, Buffer.from(res.base64, 'base64'));
			out({ saved: process.env.EASYEDA_SAVE, size: res.size, mime: res.mime, ms: r.ms });
		} else out(res);
	} else out('usage: status | info | exec <file|code> [args] | raw <file|code>');
	process.exit(0);
} catch (e: any) {
	out({ error: e.message, code: e.code, logs: e.logs });
	process.exit(1);
}
