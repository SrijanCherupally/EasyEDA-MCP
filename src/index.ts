#!/usr/bin/env node
/*
 * EasyEDA MCP — Model Context Protocol server for live EasyEDA Pro design.
 * Subcommands: (none) = MCP stdio server · hub = run the hub in the foreground · cli … = developer CLI
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VERSION } from './version.js';
import { registerCore } from './tools/core.js';
import { registerParts } from './tools/parts.js';
import { registerSchematic } from './tools/schematic.js';
import { registerPcb } from './tools/pcb.js';
import { registerExport } from './tools/export.js';
import { client } from './server/ctx.js';

const sub = process.argv[2];
if (sub === 'hub') {
	await import('./hub.js');
} else if (sub === 'cli') {
	process.argv.splice(2, 1);
	await import('./cli.js');
} else {
	const server = new McpServer(
		{ name: 'easyeda', version: VERSION },
		{
			instructions: [
				'Live control of EasyEDA Pro (schematic + PCB) plus live JLCPCB part data. Never disturb the user: snapshots are rendered from data (no window raising, no view changes); tools return the user to the tab they were on and save what they changed.',
				'Schematic: easyeda_status -> easyeda_project -> jlc_search -> sch_page (one page per function for big designs) -> sch_place (keep blocks apart) -> sch_connect -> sch_section (frame + title per block) -> sch_snapshot + sch_check (iterate until clean and readable) -> bom_check.',
				'PCB: pcb_sync -> pcb_rules (layers, clearances, track/via sizes, copper weight) -> pcb_outline -> pcb_holes -> place connectors yourself, pcb_auto_place, pcb_place tweaks -> route POWER and critical nets BY HAND (pcb_tracks with pad refs, pcb_copper for power copper areas) ->',
				'pcb_fanout GND -> pcb_autoroute only for remaining small signals (ground skipped: it comes from pours) -> pcb_pour GND top+bottom (4-layer: inner plane via pcb_rules layer_modify + pcb_copper) -> pcb_silkscreen -> pcb_drc (0 violations) -> export_files jlcpcb.',
				'Look often with sch_snapshot / pcb_snapshot. Schematic units are 0.01 inch (A4 ~1170x825, Y up); PCB tools take millimetres. Full guide: docs/agent-guide.md in the package.',
				'Anything not covered: easyeda_api_search to find the API, then easyeda_run_script (full eda.* access).',
			].join('\n'),
		},
	);
	registerCore(server);
	registerParts(server);
	registerSchematic(server);
	registerPcb(server);
	registerExport(server);
	await server.connect(new StdioServerTransport());
	// connect to (or start) the hub in the background so the first tool call is fast
	client.ensureConnected().catch(() => undefined);
}
