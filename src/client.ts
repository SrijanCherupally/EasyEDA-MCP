/*
 * Agent-side connection to the hub. Starts the hub on demand (as a detached
 * background process so it outlives this MCP server), reconnects forever,
 * and installs the in-editor helper library automatically.
 */
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { VERSION, DEFAULT_PORT } from './version.js';

export class EdaError extends Error {
	code?: string;
	logs?: string[];
	constructor(message: string, code?: string, logs?: string[]) {
		super(message);
		this.code = code;
		this.logs = logs;
	}
}

export interface ExecOptions {
	timeoutMs?: number;
	target?: string;
	/** run without the helper library (raw scripts) */
	raw?: boolean;
}

export interface ExecResult<T = any> {
	result: T;
	logs: string[];
	ms: number;
	editorId?: string;
}

type Waiter = { resolve: (m: any) => void; reject: (e: any) => void; timer: NodeJS.Timeout };

export class HubClient {
	private ws?: WebSocket;
	private seq = 0;
	private waiters = new Map<string, Waiter>();
	private connecting?: Promise<void>;
	private libCode = '';
	private libHash = '';
	private spawnedAt = 0;
	readonly port: number;
	defaultTarget?: string;
	events: any[] = [];

	constructor(private name = 'mcp', port?: number) {
		this.port = port || Number(process.env.EASYEDA_MCP_PORT) || DEFAULT_PORT;
	}

	setLibrary(code: string) {
		this.libCode = code;
		this.libHash = createHash('sha1').update(code).digest('hex');
	}

	private hubScript(): string {
		const here = dirname(fileURLToPath(import.meta.url));
		const candidates = [join(here, 'hub.js'), join(here, '..', 'dist', 'hub.js')];
		for (const c of candidates) if (existsSync(c)) return c;
		return candidates[0];
	}

	private spawnHub() {
		if (Date.now() - this.spawnedAt < 3000) return;
		this.spawnedAt = Date.now();
		const child = spawn(process.execPath, [this.hubScript()], {
			detached: true,
			stdio: 'ignore',
			windowsHide: true,
			env: { ...process.env, EASYEDA_MCP_PORT: String(this.port) },
		});
		child.unref();
	}

	private open(): Promise<WebSocket> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://127.0.0.1:${this.port}/agent?name=${encodeURIComponent(this.name)}`, { maxPayload: 256 * 1024 * 1024 });
			const t = setTimeout(() => {
				ws.terminate();
				reject(new Error('connect timeout'));
			}, 3000);
			ws.once('open', () => {
				clearTimeout(t);
				resolve(ws);
			});
			ws.once('error', (e) => {
				clearTimeout(t);
				reject(e);
			});
		});
	}

	async ensureConnected(): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
		if (this.connecting) return this.connecting;
		this.connecting = (async () => {
			let lastErr: any;
			for (let i = 0; i < 20; i++) {
				try {
					const ws = await this.open();
					this.attach(ws);
					await this.checkHubVersion();
					return;
				} catch (e: any) {
					lastErr = e;
					if (i === 0 || e?.code === 'ECONNREFUSED') this.spawnHub();
					await new Promise((r) => setTimeout(r, 250 + i * 100));
				}
			}
			throw new EdaError(`Could not reach or start the EasyEDA MCP hub on port ${this.port}: ${lastErr?.message || lastErr}`, 'HUB_UNREACHABLE');
		})().finally(() => {
			this.connecting = undefined;
		});
		return this.connecting;
	}

	private attach(ws: WebSocket) {
		this.ws = ws;
		ws.on('message', (data) => {
			let msg: any;
			try {
				msg = JSON.parse(String(data));
			} catch {
				return;
			}
			if (msg.t === 'event') {
				this.events.push({ ...msg, at: new Date().toISOString() });
				if (this.events.length > 50) this.events.shift();
				return;
			}
			const w = this.waiters.get(msg.id);
			if (!w) return;
			this.waiters.delete(msg.id);
			clearTimeout(w.timer);
			w.resolve(msg);
		});
		ws.on('close', () => {
			if (this.ws === ws) this.ws = undefined;
			for (const [id, w] of this.waiters) {
				clearTimeout(w.timer);
				w.reject(new EdaError('Connection to the hub was lost. The request may or may not have completed — re-read state before retrying.', 'HUB_LOST'));
				this.waiters.delete(id);
			}
		});
		ws.on('error', () => undefined);
	}

	/** If an older hub is running (after an upgrade), ask it to exit and start ours. */
	private async checkHubVersion() {
		const st = await this.rawSend({ t: 'status' }, 3000);
		if (st.hubVersion !== VERSION && !process.env.EASYEDA_MCP_KEEP_HUB) {
			try {
				await this.rawSend({ t: 'shutdown', reason: `upgrade ${st.hubVersion} -> ${VERSION}` }, 2000);
			} catch {
				/* ignore */
			}
			this.ws?.terminate();
			this.ws = undefined;
			await new Promise((r) => setTimeout(r, 400));
			this.spawnedAt = 0;
			this.spawnHub();
			for (let i = 0; i < 20; i++) {
				await new Promise((r) => setTimeout(r, 250));
				try {
					this.attach(await this.open());
					return;
				} catch {
					/* retry */
				}
			}
		}
	}

	private rawSend(msg: any, timeoutMs: number): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new EdaError('hub not connected', 'HUB_LOST'));
			const id = 'a' + ++this.seq;
			const timer = setTimeout(() => {
				this.waiters.delete(id);
				reject(new EdaError(`Timed out after ${timeoutMs} ms waiting for EasyEDA.`, 'TIMEOUT'));
			}, timeoutMs + 2000);
			this.waiters.set(id, { resolve, reject, timer });
			this.ws.send(JSON.stringify({ ...msg, id }));
		});
	}

	async status(): Promise<any> {
		await this.ensureConnected();
		return this.rawSend({ t: 'status' }, 5000);
	}

	/** Execute JavaScript inside EasyEDA. `eda`, `lib`, `args`, `console`, `runtime` are in scope; `return` a value. */
	async exec<T = any>(code: string, args: any = {}, opts: ExecOptions = {}): Promise<ExecResult<T>> {
		const timeoutMs = opts.timeoutMs ?? 60000;
		const target = opts.target ?? this.defaultTarget;
		for (let attempt = 0; attempt < 3; attempt++) {
			await this.ensureConnected();
			const msg = await this.rawSend({ t: 'req', op: 'exec', code, args, target, timeoutMs, libHash: opts.raw ? undefined : this.libHash }, timeoutMs);
			if (msg.ok) return { result: msg.result, logs: msg.logs || [], ms: msg.ms, editorId: msg.editorId };
			if (msg.error?.code === 'LIB_MISSING' && this.libCode) {
				const d = await this.rawSend({ t: 'req', op: 'define', code: this.libCode, hash: this.libHash, target: msg.editorId || target, timeoutMs: 30000 }, 30000);
				if (!d.ok) throw new EdaError('Failed to install helper library in EasyEDA: ' + d.error?.message, 'LIB_INSTALL_FAILED', d.logs);
				continue;
			}
			if (msg.error?.code === 'NO_EDITOR' && attempt === 0) {
				// The editor may be mid-reconnect (it retries every 1-5 s).
				await new Promise((r) => setTimeout(r, 4000));
				continue;
			}
			throw new EdaError(msg.error?.message || 'EasyEDA error', msg.error?.code, msg.logs);
		}
		throw new EdaError('EasyEDA request failed after retries', 'RETRY_EXHAUSTED');
	}

	async info(target?: string) {
		await this.ensureConnected();
		const msg = await this.rawSend({ t: 'req', op: 'info', target: target ?? this.defaultTarget, timeoutMs: 10000 }, 10000);
		if (!msg.ok) throw new EdaError(msg.error?.message, msg.error?.code);
		return msg.result;
	}
}
