import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let deferred = Promise.withResolvers();
	let value = void 0;
	let override = void 0;
	let current = $.derived(() => override ?? value);
	let promise = update(['before']);

	async function update(v) {
		deferred = Promise.withResolvers();
		await deferred.promise;
		value = v;
	}

	function indirect() {
		override;

		return promise.then(() => current());
	}

	$$renderer.push(`<button>override</button> <button>release</button> <button>resolve</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>pending...</p>`);
	}

	$$renderer.push(`<!--]-->`);
}