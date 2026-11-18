/*
 * Live JLCPCB parts data (stock, Basic / Preferred / Extended class, price breaks).
 * Uses the same public endpoint the jlcpcb.com parts page uses.
 */

const ENDPOINT = 'https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList';
const CACHE_MS = 5 * 60 * 1000;

export type JlcClass = 'Basic' | 'Preferred Extended' | 'Extended';

export interface JlcPart {
	lcsc: string;
	mpn: string;
	manufacturer: string;
	package: string;
	category: string;
	description: string;
	class: JlcClass;
	stock: number;
	price: { qty: number; usd: number }[];
	unitPrice?: number;
	minOrder?: number;
	datasheet?: string;
	url?: string;
	attributes?: Record<string, string>;
	assemblyNote?: string;
}

const cache = new Map<string, { at: number; data: any }>();
let inflight = 0;
const queue: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
	if (inflight >= 4) await new Promise<void>((r) => queue.push(r));
	inflight++;
	try {
		return await fn();
	} finally {
		inflight--;
		queue.shift()?.();
	}
}

async function post(body: any): Promise<any> {
	const key = JSON.stringify(body);
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
	let lastErr: any;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const data = await slot(async () => {
				const ctrl = new AbortController();
				const t = setTimeout(() => ctrl.abort(), 20000);
				try {
					const res = await fetch(ENDPOINT, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (easyeda-mcp)', Accept: 'application/json' },
						body: key,
						signal: ctrl.signal,
					});
					if (!res.ok) throw new Error(`JLCPCB API HTTP ${res.status}`);
					const json: any = await res.json();
					if (json.code !== 200) throw new Error(`JLCPCB API error ${json.code}: ${json.message || ''}`);
					return json.data;
				} finally {
					clearTimeout(t);
				}
			});
			cache.set(key, { at: Date.now(), data });
			return data;
		} catch (e) {
			lastErr = e;
			await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
		}
	}
	throw lastErr;
}

export function normalize(x: any, withAttrs = false): JlcPart {
	const cls: JlcClass = x.componentLibraryType === 'base' ? 'Basic' : x.preferredComponentFlag ? 'Preferred Extended' : 'Extended';
	const price = (x.componentPrices || [])
		.map((p: any) => ({ qty: p.startNumber, usd: p.productPrice }))
		.sort((a: any, b: any) => a.qty - b.qty);
	const p: JlcPart = {
		lcsc: x.componentCode,
		mpn: x.componentModelEn,
		manufacturer: x.componentBrandEn,
		package: x.componentSpecificationEn,
		category: x.componentTypeEn || x.firstSortName,
		description: (x.describe || x.erpComponentName || '').trim(),
		class: cls,
		stock: Number(x.stockCount) || 0,
		price,
		unitPrice: price[0]?.usd,
		minOrder: x.leastPatchNumber || x.minPurchaseNum,
		datasheet: x.dataManualUrl || undefined,
		url: x.lcscGoodsUrl || undefined,
	};
	if (withAttrs && Array.isArray(x.attributes)) {
		p.attributes = {};
		for (const a of x.attributes) p.attributes[a.attribute_name_en] = a.attribute_value_name;
	}
	if (x.isBuyComponent === '0' || x.noBuyReason) p.assemblyNote = x.noBuyReason || 'not orderable';
	return p;
}

export interface SearchOptions {
	limit?: number;
	page?: number;
	basicOnly?: boolean;
	/** Basic + Preferred Extended (no extended-part fee on Economic assembly) */
	noFeeOnly?: boolean;
	inStockOnly?: boolean;
	minStock?: number;
	package?: string;
	sort?: 'relevance' | 'stock' | 'price';
}

export async function search(keyword: string, opts: SearchOptions = {}): Promise<{ total: number; parts: JlcPart[] }> {
	const limit = Math.min(opts.limit ?? 10, 50);
	const body: any = { keyword, currentPage: opts.page ?? 1, pageSize: opts.basicOnly || opts.noFeeOnly || opts.inStockOnly || opts.package ? 100 : Math.max(limit, 10) };
	if (opts.basicOnly) body.componentLibraryType = 'base';
	const data = await post(body);
	let list: JlcPart[] = (data?.componentPageInfo?.list || []).map((x: any) => normalize(x));
	if (opts.noFeeOnly) list = list.filter((p) => p.class !== 'Extended');
	const minStock = opts.minStock ?? (opts.inStockOnly ? 1 : 0);
	if (minStock) list = list.filter((p) => p.stock >= minStock);
	if (opts.package) {
		const pk = opts.package.toLowerCase();
		list = list.filter((p) => (p.package || '').toLowerCase().includes(pk));
	}
	if (opts.sort === 'stock') list.sort((a, b) => b.stock - a.stock);
	if (opts.sort === 'price') list.sort((a, b) => (a.unitPrice ?? 1e9) - (b.unitPrice ?? 1e9));
	return { total: data?.componentPageInfo?.total ?? list.length, parts: list.slice(0, limit) };
}

/** Exact lookup by LCSC code (C12345). Returns null if JLCPCB doesn't list it. */
export async function part(code: string, withAttrs = true): Promise<JlcPart | null> {
	const c = code.trim().toUpperCase();
	if (!/^C\d+$/.test(c)) throw new Error(`"${code}" is not an LCSC code (expected C followed by digits).`);
	const data = await post({ keyword: c, currentPage: 1, pageSize: 10 });
	const hit = (data?.componentPageInfo?.list || []).find((x: any) => String(x.componentCode).toUpperCase() === c);
	return hit ? normalize(hit, withAttrs) : null;
}

export async function parts(codes: string[], withAttrs = false): Promise<Record<string, JlcPart | null>> {
	const uniq = [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
	const out: Record<string, JlcPart | null> = {};
	await Promise.all(
		uniq.map(async (c) => {
			try {
				out[c] = await part(c, withAttrs);
			} catch {
				out[c] = null;
			}
		}),
	);
	return out;
}

export function priceAt(p: JlcPart, qty: number): number | undefined {
	let best: number | undefined;
	for (const b of p.price) if (qty >= b.qty) best = b.usd;
	return best ?? p.price[0]?.usd;
}

/* ---------------- value parsing for part/value mismatch checks ---------------- */

const SI: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, μ: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

/** Parse "4.7uF", "10kΩ", "4k7", "100nF", "0.1uF", "1M" → number in base units. */
export function parseValue(s: string | undefined): number | undefined {
	if (!s) return undefined;
	const t = String(s)
		.replace(/\s+/g, '')
		.replace(/(ohms?|Ω)$/i, '')
		.replace(/[FH]$/, '')
		.replace(/^(\d+(?:\.\d+)?)R$/i, '$1');
	let m = t.match(/^(\d+(?:\.\d+)?)([pnuµμmkKMG]?)$/);
	if (m) return parseFloat(m[1]) * SI[m[2]];
	m = t.match(/^(\d+)([pnuµμmkKMGR])(\d+)$/); // 4k7, 2R2
	if (m) return parseFloat(`${m[1]}.${m[3]}`) * (m[2] === 'R' ? 1 : SI[m[2]]);
	return undefined;
}

/** Extract the primary value of a JLC part description: resistance / capacitance / inductance. */
export function jlcPrimaryValue(p: JlcPart): { kind: 'R' | 'C' | 'L'; value: number } | undefined {
	const d = `${p.description} ${p.category}`;
	const cat = (p.category || '').toLowerCase();
	const kind: 'R' | 'C' | 'L' | undefined = /resistor/.test(cat) ? 'R' : /capacitor/.test(cat) ? 'C' : /inductor/.test(cat) ? 'L' : undefined;
	if (!kind) return undefined;
	const re = kind === 'R' ? /(\d+(?:\.\d+)?)\s*([mkKMG]?)Ω/ : kind === 'C' ? /(\d+(?:\.\d+)?)\s*([pnuµμm]?)F\b/ : /(\d+(?:\.\d+)?)\s*([pnuµμm]?)H\b/;
	const m = d.match(re);
	if (!m) return undefined;
	return { kind, value: parseFloat(m[1]) * SI[m[2]] };
}
