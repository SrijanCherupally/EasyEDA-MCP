/*
 * EasyEDA MCP hub.
 *
 * A tiny, standalone WebSocket router that runs as its own background process.
 * EasyEDA editors connect on /eda, MCP servers (agents) connect on /agent.
 * Several agents (Claude Code, Codex, …) and several EasyEDA windows can share
 * one hub at the same time — nobody has to "disconnect the other one" anymore.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { VERSION, DEFAULT_PORT } from './version.js';

interface Editor {
	ws: WebSocket;
	id: string;
	info: any;
	connectedAt: number;
	lastSeen: number;
	busy: number;
}
interface Agent {
	ws: WebSocket;
	id: string;
	name: string;
	connectedAt: number;
}
interface Pending {
	agent: Agent;
	agentReqId: string;
	editor: Editor;
	timer: NodeJS.Timeout;
}

const port = Number(process.env.EASYEDA_MCP_PORT || DEFAULT_PORT);
const IDLE_EXIT_MS = Number(process.env.EASYEDA_MCP_HUB_IDLE_MS || 30 * 60 * 1000);

const editors = new Map<string, Editor>();
const agents = new Map<string, Agent>();
const pending = new Map<string, Pending>();
let seq = 0;
let lastAgentActivity = Date.now();

function log(...a: any[]) {
	if (process.env.EASYEDA_MCP_HUB_QUIET) return;
	console.error(new Date().toISOString(), '[hub]', ...a);
}

function send(ws: WebSocket, msg: any) {
	if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function editorSummary(e: Editor) {
	return {
		id: e.id,
		edaVersion: e.info?.edaVersion,
		runtimeVersion: e.info?.runtimeVersion,
		evalMode: e.info?.evalMode,
		project: e.info?.project,
		document: e.info?.document,
		connectedAt: new Date(e.connectedAt).toISOString(),
		lastSeenMsAgo: Date.now() - e.lastSeen,
		busy: e.busy,
	};
}

function pickEditor(target?: string): Editor | undefined {
	if (target) {
		const e = editors.get(target);
		if (e) return e;
		for (const ed of editors.values()) {
			if (ed.info?.project?.uuid === target || ed.info?.project?.name === target) return ed;
		}
		return undefined;
	}
	// Prefer the most recently loaded runtime (EasyEDA can briefly hold an older
	// copy after a reinstall), then the most recently connected socket.
	let best: Editor | undefined;
	const score = (e: Editor) => (Number(e.info?.loadedAt) || 0) * 10 + e.connectedAt / 1e6;
	for (const e of editors.values()) {
		if (Date.now() - e.lastSeen > 20000) continue;
		if (!best || score(e) > score(best)) best = e;
	}
	return best;
}

const wss = new WebSocketServer({ host: '127.0.0.1', port, maxPayload: 256 * 1024 * 1024 });

wss.on('listening', () => log(`EasyEDA MCP hub ${VERSION} listening on ws://127.0.0.1:${port}`));
wss.on('error', (err: any) => {
	if (err?.code === 'EADDRINUSE') {
		log('port in use, another hub is already running — exiting');
		process.exit(0);
	}
	log('server error', err);
	process.exit(1);
});

wss.on('connection', (ws, req) => {
	const path = (req.url || '/').split('?')[0];
	if (path.startsWith('/eda')) onEditor(ws);
	else onAgent(ws, req.url || '');
});

function onEditor(ws: WebSocket) {
	let editor: Editor | undefined;
	const tmpId = 'pending-' + ++seq;
	const chunks = new Map<string, string[]>();
	ws.on('message', (data) => {
		let msg: any;
		try {
			msg = JSON.parse(String(data));
		} catch {
			return;
		}
		if (editor) editor.lastSeen = Date.now();
		if (msg.t === 'chunk') {
			let parts = chunks.get(msg.id);
			if (!parts) chunks.set(msg.id, (parts = new Array(msg.n)));
			parts[msg.i] = msg.data;
			if (parts.filter((x) => x !== undefined).length < msg.n) return;
			chunks.delete(msg.id);
			try {
				msg = JSON.parse(parts.join(''));
			} catch {
				return;
			}
		}
		if (msg.t === 'hello') {
			const id = String(msg.instanceId || tmpId);
			const old = editors.get(id);
			if (old && old.ws !== ws) {
				try {
					old.ws.close(4000, 'replaced by new connection');
				} catch {
					/* ignore */
				}
			}
			editor = { ws, id, info: msg, connectedAt: Date.now(), lastSeen: Date.now(), busy: 0 };
			editors.set(id, editor);
			send(ws, { t: 'welcome', hubVersion: VERSION });
			log('editor connected', id, msg.edaVersion, msg.project?.name ?? '');
			broadcastAgents({ t: 'event', event: 'editor_connected', editor: editorSummary(editor) });
			return;
		}
		if (msg.t === 'pong') return;
		if (msg.t === 'res') {
			const p = pending.get(msg.id);
			if (!p) return;
			pending.delete(msg.id);
			clearTimeout(p.timer);
			p.editor.busy = Math.max(0, p.editor.busy - 1);
			send(p.agent.ws, { ...msg, id: p.agentReqId, editorId: p.editor.id });
		}
		if (msg.t === 'info' && editor) editor.info = { ...editor.info, ...msg.info };
	});
	ws.on('close', () => {
		if (!editor) return;
		if (editors.get(editor.id)?.ws === ws) editors.delete(editor.id);
		for (const [id, p] of pending) {
			if (p.editor === editor) {
				clearTimeout(p.timer);
				pending.delete(id);
				send(p.agent.ws, {
					t: 'res',
					id: p.agentReqId,
					ok: false,
					error: { message: 'EasyEDA disconnected while running this request. It may or may not have been applied — re-read the design before retrying.', code: 'EDITOR_DISCONNECTED' },
				});
			}
		}
		log('editor disconnected', editor.id);
		broadcastAgents({ t: 'event', event: 'editor_disconnected', editorId: editor.id });
	});
	ws.on('error', () => undefined);
}

function onAgent(ws: WebSocket, url: string) {
	const params = new URLSearchParams(url.split('?')[1] || '');
	const agent: Agent = { ws, id: 'agent-' + ++seq, name: params.get('name') || 'agent', connectedAt: Date.now() };
	agents.set(agent.id, agent);
	lastAgentActivity = Date.now();
	log('agent connected', agent.id, agent.name);
	ws.on('message', (data) => {
		lastAgentActivity = Date.now();
		let msg: any;
		try {
			msg = JSON.parse(String(data));
		} catch {
			return;
		}
		if (msg.t === 'status') {
			send(ws, {
				t: 'status',
				id: msg.id,
				hubVersion: VERSION,
				port,
				pid: process.pid,
				uptimeS: Math.round(process.uptime()),
				editors: [...editors.values()].map(editorSummary),
				agents: [...agents.values()].map((a) => ({ id: a.id, name: a.name, connectedAt: new Date(a.connectedAt).toISOString() })),
			});
			return;
		}
		if (msg.t === 'shutdown') {
			log('shutdown requested by', agent.name, msg.reason || '');
			send(ws, { t: 'bye', id: msg.id });
			setTimeout(() => process.exit(0), 100);
			return;
		}
		if (msg.t === 'req') {
			const editor = pickEditor(msg.target);
			if (!editor) {
				send(ws, {
					t: 'res',
					id: msg.id,
					ok: false,
					error: {
						code: 'NO_EDITOR',
						message: msg.target
							? `No EasyEDA editor matches "${msg.target}".`
							: 'No EasyEDA Pro window is connected to the hub. Open EasyEDA Pro with the "EasyEDA MCP" extension installed and External Interaction allowed; it connects automatically within a few seconds.',
					},
				});
				return;
			}
			const hubId = 'h' + ++seq;
			const timeoutMs = Math.min(Number(msg.timeoutMs) || 60000, 15 * 60 * 1000);
			const timer = setTimeout(() => {
				if (!pending.has(hubId)) return;
				pending.delete(hubId);
				editor.busy = Math.max(0, editor.busy - 1);
				send(ws, {
					t: 'res',
					id: msg.id,
					ok: false,
					error: { code: 'TIMEOUT', message: `EasyEDA did not answer within ${timeoutMs} ms. The operation may still complete; re-read the design before retrying.` },
				});
			}, timeoutMs);
			pending.set(hubId, { agent, agentReqId: msg.id, editor, timer });
			editor.busy++;
			send(editor.ws, { ...msg, id: hubId });
		}
	});
	ws.on('close', () => {
		agents.delete(agent.id);
		lastAgentActivity = Date.now();
		log('agent disconnected', agent.id);
	});
	ws.on('error', () => undefined);
}

function broadcastAgents(msg: any) {
	for (const a of agents.values()) send(a.ws, msg);
}

// Heartbeat: editors cannot detect a dead socket on their own (the EasyEDA
// WebSocket API has no close callback), so we ping them and they watch for it.
setInterval(() => {
	for (const e of editors.values()) {
		send(e.ws, { t: 'ping', at: Date.now() });
		if (Date.now() - e.lastSeen > 30000) {
			log('editor heartbeat lost', e.id);
			try {
				e.ws.terminate();
			} catch {
				/* ignore */
			}
		}
	}
	// stay up while any EasyEDA window is connected, so editors never have to reconnect
	if (agents.size === 0 && editors.size === 0 && Date.now() - lastAgentActivity > IDLE_EXIT_MS) {
		log('idle with no agents and no editors — exiting');
		process.exit(0);
	}
}, 5000).unref?.();

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
