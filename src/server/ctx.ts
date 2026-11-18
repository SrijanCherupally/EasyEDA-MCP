/* Shared server context: hub client, unit helpers, compact results, window handling. */
import { HubClient, EdaError } from '../client.js';
import { EDA_LIBRARY } from '../eda/library.js';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join } from 'node:path';

export const client = new HubClient(process.env.EASYEDA_MCP_AGENT_NAME || 'mcp');
client.setLibrary(EDA_LIBRARY);

export const MIL_PER_MM = 1 / 0.0254;
export const mm2mil = (mm: number) => mm * MIL_PER_MM;
export const mil2mm = (mil: number) => Math.round(mil * 0.0254 * 1000) / 1000;

export const DATA_DIR = process.env.EASYEDA_MCP_HOME || join(homedir(), '.easyeda-mcp');
export const OUT_DIR = join(DATA_DIR, 'out');
mkdirSync(OUT_DIR, { recursive: true });

/** Execute JavaScript in EasyEDA with the helper library available as `lib`. */
export async function run<T = any>(code: string, args: any = {}, timeoutMs = 60000): Promise<T> {
	const r = await client.exec<T>(code, args, { timeoutMs });
	return r.result;
}

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export interface ToolResult {
	content: Content[];
	isError?: boolean;
	[k: string]: unknown;
}

const MAX_TEXT = Number(process.env.EASYEDA_MCP_MAX_TEXT || 24000);

/** Compact JSON text; very large payloads are written to a file and summarised. */
export function text(obj: any, note?: string): ToolResult {
	let s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 0);
	if (s.length > MAX_TEXT) {
		const file = join(OUT_DIR, `result-${Date.now()}.json`);
		writeFileSync(file, typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1));
		s = s.slice(0, MAX_TEXT) + `\n… [truncated: ${s.length} chars total — full result saved to ${file}. Narrow the query (filters / designators / region) to get less.]`;
	}
	return { content: [{ type: 'text', text: note ? `${note}\n${s}` : s }] };
}

export function image(base64: string, mimeType = 'image/png', caption?: string): ToolResult {
	const c: Content[] = [{ type: 'image', data: base64, mimeType }];
	if (caption) c.unshift({ type: 'text', text: caption });
	return { content: c };
}

export function fail(e: any): ToolResult {
	const code = e?.code ? ` [${e.code}]` : '';
	let msg = `Error${code}: ${e?.message ?? e}`;
	if (e?.code === 'NO_EDITOR') msg += '\nTip: run easyeda_status for setup help.';
	if (e?.logs?.length) msg += `\nlogs:\n${e.logs.join('\n')}`;
	return { content: [{ type: 'text', text: msg }], isError: true };
}

/** Tool wrapper: error formatting, and afterwards puts the user back on the tab they were working in. */
export function wrap<A>(fn: (args: A) => Promise<ToolResult>, opts: { save?: boolean } = {}) {
	return async (args: A) => {
		try {
			const r = await fn(args);
			if (opts.save && process.env.EASYEDA_MCP_AUTOSAVE !== '0') await saveActive().catch(() => undefined);
			return r;
		} catch (e) {
			return fail(e);
		} finally {
			if (process.env.EASYEDA_MCP_KEEP_TAB !== '1') await client.exec('return lib.restoreTab()', {}, { timeoutMs: 8000 }).catch(() => undefined);
		}
	};
}

/** Save the document the tool just worked on (before the user's tab is restored). */
export async function saveActive() {
	return run(`const t = await lib.activeDocType(); if (t === 'pcb') return eda.pcb_Document.save(); if (t === 'schematic') return eda.sch_Document.save(); return false;`, {}, 30000);
}

/* ---------------- bringing EasyEDA to the front for rendering ---------------- */

const PS_RAISE = String.raw`
param([string]$mode = 'raise', [string]$prev = '0')
Add-Type @"
using System; using System.Runtime.InteropServices;
public class EdaW { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
[DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e); }
"@
function Focus([IntPtr]$h) {
  if ([EdaW]::IsIconic($h)) { [EdaW]::ShowWindow($h, 9) | Out-Null }
  [EdaW]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [EdaW]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
  [EdaW]::SetForegroundWindow($h) | Out-Null
}
if ($mode -eq 'restore') { if ($prev -ne '0') { Focus ([IntPtr][long]$prev) }; 'RESTORED'; exit 0 }
$p = Get-Process easyeda-pro,lceda-pro,jlceda-pro -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { 'NOWINDOW'; exit 0 }
$fg = [EdaW]::GetForegroundWindow()
if ($fg -eq $p.MainWindowHandle) { 'ALREADY'; exit 0 }
Focus $p.MainWindowHandle
"RAISED $([long]$fg)"
`;

const PS_SHOT = String.raw`
param([string]$out)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class EdaW2 { [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
[DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
[DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }
"@
[EdaW2]::SetProcessDPIAware() | Out-Null
$p = Get-Process easyeda-pro,lceda-pro,jlceda-pro -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { 'NOWINDOW'; exit 1 }
$r = New-Object EdaW2+RECT; [EdaW2]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
$bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); 'SAVED'
`;

function psFile(name: string, body: string) {
	const f = join(DATA_DIR, name);
	writeFileSync(f, body);
	return f;
}
let raiseScript = '';
let shotScript = '';

function ps(file: string, args: string[]): string {
	const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file, ...args], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
	return (r.stdout || '').trim();
}

/**
 * EasyEDA (Electron) stops repainting while its window is hidden or covered, which makes canvas
 * captures stale and some exports hang. We bring it forward briefly and give focus back afterwards.
 */
export async function withEditorVisible<T>(fn: () => Promise<T>, explicit = false): Promise<T> {
	// Never steal focus unless the user explicitly asked for it (easyeda_ui focus/screenshot) or opted in.
	if (!explicit && process.env.EASYEDA_MCP_ALLOW_RAISE !== '1') return fn();
	let prev = '';
	if (platform() === 'win32') {
		raiseScript ||= psFile('raise-window.ps1', PS_RAISE);
		const out = ps(raiseScript, ['raise']);
		if (out.startsWith('RAISED')) prev = out.split(' ')[1] || '';
		if (prev) await new Promise((r) => setTimeout(r, 450));
	} else if (platform() === 'darwin') {
		spawnSync('osascript', ['-e', 'tell application "EasyEDA Pro" to activate'], { timeout: 5000 });
		await new Promise((r) => setTimeout(r, 450));
	}
	try {
		return await fn();
	} finally {
		if (prev && process.env.EASYEDA_MCP_KEEP_FOCUS !== '1') ps(raiseScript, ['restore', prev]);
	}
}

/** Screenshot of the whole EasyEDA window (shows dialogs). Windows only. */
export function windowScreenshot(): string | null {
	if (platform() !== 'win32') return null;
	shotScript ||= psFile('window-shot.ps1', PS_SHOT);
	const f = join(tmpdir(), `easyeda-window-${Date.now()}.png`);
	const out = ps(shotScript, [f]);
	return out.includes('SAVED') ? f : null;
}

export { EdaError };
