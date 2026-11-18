// Dev harness: node scripts/mcp-call.mjs <tool> '<json args>' [imageOut.png]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const [tool, json = '{}', imgOut] = process.argv.slice(2);
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/index.js'], env: { ...process.env, EASYEDA_MCP_AGENT_NAME: 'harness' } });
const client = new Client({ name: 'harness', version: '1' });
await client.connect(transport);
if (tool === 'list') {
	const t = await client.listTools();
	console.log(t.tools.map((x) => x.name).join('\n'));
} else {
	const args = existsSync(json) ? JSON.parse(readFileSync(json, 'utf8')) : JSON.parse(json);
	const r = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: 900000 });
	for (const c of r.content) {
		if (c.type === 'text') console.log(c.text);
		else if (c.type === 'image') {
			const f = imgOut || `shot-${Date.now()}.png`;
			writeFileSync(f, Buffer.from(c.data, 'base64'));
			console.log('[image saved to ' + f + ']');
		}
	}
	if (r.isError) process.exitCode = 1;
}
await client.close();
