/*
 * EasyEDA MCP — in-editor runtime.
 *
 * This extension is intentionally thin. It keeps a WebSocket connection to the
 * local EasyEDA MCP hub alive forever, and executes JavaScript sent by the MCP
 * server with the full `eda` API in scope. Every high-level tool lives on the
 * Node side, so the MCP server can be upgraded without reinstalling this file.
 */
import Sval from 'sval';

declare const eda: any;

const RUNTIME_VERSION = '1.0.5';
const LOADED_AT = Date.now();
const DEFAULT_PORT = 18765;
const HEARTBEAT_TIMEOUT_MS = 15000;
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 5000;

type Json = any;

const state = {
	socketId: '',
	attempt: 0,
	connected: false,
	connecting: false,
	lastMessageAt: 0,
	lastError: '',
	instanceId: '',
	lib: {} as Record<string, any>,
	libHash: '',
	evalMode: '' as '' | 'native' | 'sval',
	requestsServed: 0,
	started: false,
	watchdog: undefined as any,
	retryTimer: undefined as any,
	retryAt: 0,
	connectDeadline: 0,
	queue: Promise.resolve() as Promise<unknown>,
	port: DEFAULT_PORT,
};

function log(...a: any[]) {
	try {
		// eslint-disable-next-line no-console
		console.log('[easyeda-mcp]', ...a);
	} catch {
		/* ignore */
	}
}

function toast(msg: string, type = 'info') {
	try {
		eda.sys_Message.showToastMessage(msg, type, 3);
	} catch {
		/* ignore */
	}
}

function randomId() {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getPort(): number {
	try {
		const p = eda.sys_Storage.getExtensionUserConfig('port');
		if (p && Number(p) > 0) return Number(p);
	} catch {
		/* ignore */
	}
	return DEFAULT_PORT;
}

/* ----------------------------- evaluation ----------------------------- */

const AsyncFunction: any = Object.getPrototypeOf(async function () {}).constructor;

function detectEvalMode() {
	if (state.evalMode) return state.evalMode;
	try {
		const f = new AsyncFunction('a', 'return a + 1');
		if (f) state.evalMode = 'native';
	} catch {
		state.evalMode = 'sval';
	}
	return state.evalMode;
}

async function runCode(code: string, scope: Record<string, any>): Promise<any> {
	const names = Object.keys(scope);
	const values = names.map((n) => scope[n]);
	if (detectEvalMode() === 'native') {
		try {
			const fn = new AsyncFunction(...names, code);
			return await fn(...values);
		} catch (e: any) {
			// CSP failures surface as EvalError at construction time.
			if (e && (e.name === 'EvalError' || /unsafe-eval|Content Security/i.test(String(e.message)))) {
				state.evalMode = 'sval';
			} else {
				throw e;
			}
		}
	}
	const interp = new (Sval as any)({ ecmaVer: 'latest', sourceType: 'script' });
	interp.import(scope);
	interp.import({ __resolve: undefined });
	let resolve!: (v: any) => void;
	let reject!: (e: any) => void;
	const done = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	interp.import({ __res: resolve, __rej: reject });
	interp.run(`(async () => { ${code}\n })().then(__res, __rej);`);
	return done;
}

/* ----------------------------- serialization ----------------------------- */

function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
	}
	return btoa(bin);
}

async function blobToPayload(b: Blob) {
	const buf = new Uint8Array(await b.arrayBuffer());
	return { __blob: true, mime: (b as any).type || 'application/octet-stream', name: (b as any).name, size: buf.length, base64: bytesToBase64(buf) };
}

/** Convert EasyEDA primitive objects (which hide state behind getState_* methods) into plain JSON. */
async function serialize(v: any, depth = 0, seen = new WeakSet()): Promise<Json> {
	if (v === null || v === undefined) return v ?? null;
	const t = typeof v;
	if (t === 'number') return Number.isFinite(v) ? v : String(v);
	if (t === 'string' || t === 'boolean') return v;
	if (t === 'bigint') return String(v);
	if (t === 'function') return undefined;
	if (typeof Blob !== 'undefined' && v instanceof Blob) return blobToPayload(v);
	if (v instanceof ArrayBuffer) return { __blob: true, mime: 'application/octet-stream', base64: bytesToBase64(new Uint8Array(v)) };
	if (ArrayBuffer.isView(v)) return Array.from(v as any);
	if (depth > 12) return '[depth]';
	if (t === 'object') {
		if (seen.has(v)) return '[circular]';
		seen.add(v);
		if (Array.isArray(v)) {
			const out = [];
			for (const x of v) out.push(await serialize(x, depth + 1, seen));
			return out;
		}
		if (v instanceof Map) {
			const o: any = {};
			for (const [k, x] of v) o[String(k)] = await serialize(x, depth + 1, seen);
			return o;
		}
		if (v instanceof Set) return serialize(Array.from(v), depth + 1, seen);
		if (v instanceof Error) return { __error: true, name: v.name, message: v.message };
		// Primitive objects: collect getState_* values.
		const proto = Object.getPrototypeOf(v);
		const getters: string[] = [];
		if (proto && proto !== Object.prototype) {
			let p = proto;
			while (p && p !== Object.prototype) {
				for (const k of Object.getOwnPropertyNames(p)) {
					if (k.startsWith('getState_') && typeof v[k] === 'function' && !getters.includes(k)) getters.push(k);
				}
				p = Object.getPrototypeOf(p);
			}
		}
		if (getters.length) {
			const o: any = {};
			for (const g of getters) {
				try {
					let val = v[g]();
					if (val && typeof val.then === 'function') val = await val;
					o[g.slice(9, 10).toLowerCase() + g.slice(10)] = await serialize(val, depth + 1, seen);
				} catch {
					/* skip */
				}
			}
			return o;
		}
		const o: any = {};
		for (const k of Object.keys(v)) {
			const x = await serialize(v[k], depth + 1, seen);
			if (x !== undefined) o[k] = x;
		}
		return o;
	}
	return String(v);
}

/* ----------------------------- protocol ----------------------------- */

const CHUNK = 512 * 1024;
function send(msg: Json) {
	try {
		const text = JSON.stringify(msg);
		if (text.length <= CHUNK) {
			eda.sys_WebSocket.send(state.socketId, text);
		} else {
			// Large payloads (images, exports) are split so no transport limit is hit.
			const n = Math.ceil(text.length / CHUNK);
			for (let i = 0; i < n; i++) {
				eda.sys_WebSocket.send(state.socketId, JSON.stringify({ t: 'chunk', id: msg.id, i, n, data: text.slice(i * CHUNK, (i + 1) * CHUNK) }));
			}
		}
	} catch (e: any) {
		state.lastError = 'send failed: ' + (e?.message || e);
		markDisconnected();
	}
}

async function editorInfo() {
	const info: any = { runtimeVersion: RUNTIME_VERSION, instanceId: state.instanceId, evalMode: detectEvalMode(), loadedAt: LOADED_AT, href: typeof location !== 'undefined' ? String(location.href).slice(0, 120) : undefined, top: typeof window !== 'undefined' ? window === window.top : undefined };
	try {
		info.edaVersion = eda.sys_Environment.getEditorCurrentVersion();
	} catch {
		/* ignore */
	}
	try {
		info.isClient = eda.sys_Environment.isClient();
	} catch {
		/* ignore */
	}
	try {
		const p = await eda.dmt_Project.getCurrentProjectInfo();
		if (p) info.project = { uuid: p.uuid, name: p.friendlyName || p.name };
	} catch {
		/* ignore */
	}
	try {
		const d = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		if (d) info.document = d;
	} catch {
		/* ignore */
	}
	return info;
}

async function handle(msg: any) {
	if (msg.t === 'ping') {
		send({ t: 'pong', at: Date.now() });
		return;
	}
	if (msg.t === 'welcome') {
		log('hub welcomed us', msg.hubVersion);
		return;
	}
	if (msg.t !== 'req') return;
	const started = Date.now();
	const logs: string[] = [];
	const cons = {
		log: (...a: any[]) => logs.length < 200 && logs.push(a.map((x) => (typeof x === 'string' ? x : safeJson(x))).join(' ')),
	};
	(cons as any).warn = cons.log;
	(cons as any).error = cons.log;
	try {
		let result: any;
		if (msg.op === 'info') {
			result = await editorInfo();
		} else if (msg.op === 'define') {
			// Install / replace the helper library supplied by the MCP server.
			if (msg.hash && msg.hash === state.libHash) {
				result = { cached: true };
			} else {
				const lib = await runCode(msg.code, { eda, console: cons, runtime: runtimeApi });
				state.lib = lib || {};
				state.libHash = msg.hash || '';
				result = { installed: Object.keys(state.lib).length };
			}
		} else if (msg.op === 'exec') {
			if (msg.libHash && msg.libHash !== state.libHash) {
				send({ t: 'res', id: msg.id, ok: false, error: { code: 'LIB_MISSING', message: 'helper library not installed' }, ms: 0 });
				return;
			}
			const raw = await runCode(msg.code, { eda, lib: state.lib, args: msg.args ?? {}, console: cons, runtime: runtimeApi });
			result = await serialize(raw);
		} else {
			throw new Error('Unknown op ' + msg.op);
		}
		state.requestsServed++;
		send({ t: 'res', id: msg.id, ok: true, result, logs, ms: Date.now() - started });
	} catch (e: any) {
		send({
			t: 'res',
			id: msg.id,
			ok: false,
			error: { message: String(e?.message ?? e), name: e?.name, stack: String(e?.stack || '').split('\n').slice(0, 6).join('\n') },
			logs,
			ms: Date.now() - started,
		});
	}
}

function safeJson(x: any) {
	try {
		return JSON.stringify(x);
	} catch {
		return String(x);
	}
}

const runtimeApi = {
	version: RUNTIME_VERSION,
	serialize,
	blobToPayload,
	sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
	get state() {
		return state;
	},
	reconnect: () => reconnect(),
};

function withTimeout(p: Promise<unknown>, ms: number) {
	return Promise.race([p, new Promise((r) => setTimeout(r, ms + 1000))]);
}

/* ----------------------------- connection ----------------------------- */

function markDisconnected() {
	if (state.connected) log('disconnected');
	state.connected = false;
	state.connecting = false;
	scheduleRetry();
}

function scheduleRetry() {
	if (state.retryTimer) return;
	const delay = Math.min(RETRY_MAX_MS, RETRY_MIN_MS * Math.pow(1.5, Math.min(state.attempt, 6)));
	state.retryTimer = true;
	state.retryAt = Date.now() + delay;
}

function closeSocket() {
	if (!state.socketId) return;
	try {
		eda.sys_WebSocket.close(state.socketId, 1000, 'reconnect');
	} catch {
		/* ignore */
	}
	state.socketId = '';
}

function openSocket() {
	if (state.connecting) return;
	closeSocket();
	state.connecting = true;
	state.attempt++;
	state.port = getPort();
	// The socket id is global inside EasyEDA: two runtime instances using the same id
	// (e.g. 'easyeda-mcp-1') close each other's sockets in an endless loop. Make it unique.
	const id = 'easyeda-mcp-' + state.instanceId + '-' + state.attempt + '-' + Date.now().toString(36);
	state.socketId = id;
	const uri = `ws://127.0.0.1:${state.port}/eda`;
	const attemptAt = Date.now();
	try {
		eda.sys_WebSocket.register(
			id,
			uri,
			async (event: MessageEvent) => {
				if (id !== state.socketId) return;
				state.lastMessageAt = Date.now();
				let msg: any;
				try {
					msg = JSON.parse(typeof event.data === 'string' ? event.data : await (event.data as Blob).text());
				} catch {
					return;
				}
				if (msg.t === 'ping') {
					send({ t: 'pong', at: Date.now() });
					return;
				}
				// Serialize requests (the EasyEDA API is not safe under concurrent mutation),
				// but never let one hung API call block the queue forever.
				if (msg.t === 'req' && (msg.op === 'info' || msg.parallel)) {
					void handle(msg);
					return;
				}
				state.queue = state.queue.then(() => withTimeout(handle(msg), Number(msg.timeoutMs) || 60000)).catch(() => undefined);
			},
			async () => {
				if (id !== state.socketId) return;
				state.connected = true;
				state.connecting = false;
				state.attempt = 0;
				state.lastMessageAt = Date.now();
				log('connected to', uri);
				send({ t: 'hello', role: 'eda', ...(await editorInfo()) });
			},
		);
	} catch (e: any) {
		state.lastError = String(e?.message || e);
		state.connecting = false;
		scheduleRetry();
		return;
	}
	// If the connected callback never fires, the watchdog tick retries (see connectDeadline).
	state.connectDeadline = attemptAt + 3000;
	void id;
}

/**
 * Timers in a hidden Electron/Chromium window are throttled to about once a minute, which made
 * reconnects slow. A tiny Web Worker keeps ticking at full speed and drives the watchdog instead.
 */
function startTicker(fn: () => void, ms: number) {
	try {
		const src = `setInterval(() => postMessage(0), ${ms});`;
		const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
		w.onmessage = () => fn();
		return { stop: () => w.terminate() };
	} catch {
		const h = setInterval(fn, ms);
		return { stop: () => clearInterval(h) };
	}
}

function startWatchdog() {
	if (state.watchdog) return;
	state.watchdog = startTicker(() => {
		// retries are scheduled as timestamps and fired from the (unthrottled) tick
		if (state.retryAt && Date.now() >= state.retryAt) {
			state.retryAt = 0;
			state.retryTimer = undefined;
			openSocket();
		}
		if (state.connecting && !state.connected && state.connectDeadline && Date.now() > state.connectDeadline) {
			state.connectDeadline = 0;
			state.connecting = false;
			scheduleRetry();
		}
		if (state.connected && Date.now() - state.lastMessageAt > HEARTBEAT_TIMEOUT_MS) {
			state.lastError = 'heartbeat timeout';
			closeSocket();
			markDisconnected();
		}
		if (!state.connected && !state.connecting && !state.retryTimer) scheduleRetry();
	}, 1000);
}

function start() {
	if (!state.instanceId) state.instanceId = randomId();
	state.started = true;
	startWatchdog();
	openSocket();
}

/* ----------------------------- exported entry points ----------------------------- */

export function activate(_status?: string, _arg?: string) {
	log('activated', RUNTIME_VERSION);
	start();
}

export function connect() {
	state.attempt = 0;
	start();
	toast('EasyEDA MCP: connecting to ws://127.0.0.1:' + getPort());
}

export function reconnect() {
	closeSocket();
	state.connected = false;
	state.connecting = false;
	state.attempt = 0;
	state.retryTimer = undefined;
	state.retryAt = 0;
	start();
	toast('EasyEDA MCP: reconnecting…');
}

export function showStatus() {
	const lines = [
		`Runtime: ${RUNTIME_VERSION}  (eval: ${detectEvalMode()})`,
		`Hub: ws://127.0.0.1:${state.port}`,
		`Status: ${state.connected ? 'CONNECTED' : state.connecting ? 'connecting…' : 'waiting for MCP server (auto-retry)'}`,
		`Requests served: ${state.requestsServed}`,
		`Helper library: ${state.libHash ? 'loaded ' + state.libHash.slice(0, 8) : 'not loaded'}`,
		state.lastError ? `Last error: ${state.lastError}` : '',
		`Instance: ${state.instanceId}`,
	].filter(Boolean);
	try {
		eda.sys_Dialog.showInformationMessage(lines.join('\n'), 'EasyEDA MCP');
	} catch {
		toast(lines.join(' | '));
	}
}

export function setPort() {
	try {
		eda.sys_Dialog.showInputDialog('Hub port (default 18765)', '', 'EasyEDA MCP', 'number', getPort(), { min: 1, max: 65535 }, async (v: any) => {
			const n = Number(v);
			if (n > 0 && n < 65536) {
				await eda.sys_Storage.setExtensionUserConfig('port', n);
				reconnect();
			}
		});
	} catch (e: any) {
		toast('Could not open dialog: ' + e?.message);
	}
}

// Start as soon as the script is loaded, independent of activation events.
try {
	setTimeout(() => {
		if (!state.started) start();
	}, 1500);
} catch {
	/* ignore */
}
