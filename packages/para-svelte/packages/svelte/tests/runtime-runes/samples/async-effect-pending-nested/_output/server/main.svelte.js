import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let value = 0;
	let deferreds = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		deferreds.push({ value, deferred });

		return deferred.promise;
	}

	function shift() {
		const d = deferreds.shift();

		d?.deferred.resolve(d.value);
	}

	$$renderer.push(`<button>increment</button> <button>shift</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		$$renderer.push(`<p>loading...</p>`);
	}

	$$renderer.push(`<!--]-->`);
}