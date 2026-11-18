import assert from 'node:assert/strict';
export { describe, it } from 'node:test';
export function expect(v: any) {
	const api = {
		toBe: (x: any) => assert.equal(v, x),
		toEqual: (x: any) => assert.deepEqual(v, x),
		toBeGreaterThan: (x: number) => assert.ok(v > x, `${v} > ${x}`),
		toBeGreaterThanOrEqual: (x: number) => assert.ok(v >= x, `${v} >= ${x}`),
		toBeLessThan: (x: number) => assert.ok(v < x, `${v} < ${x}`),
		toBeUndefined: () => assert.equal(v, undefined),
		toBeDefined: () => assert.notEqual(v, undefined),
		toBeTruthy: () => assert.ok(v),
		not: { toBe: (x: any) => assert.notEqual(v, x) },
	};
	return api;
}
