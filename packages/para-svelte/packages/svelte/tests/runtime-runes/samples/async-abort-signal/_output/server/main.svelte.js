import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { getAbortSignal } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let deferred = Promise.withResolvers();

		function load(deferred) {
			const signal = getAbortSignal();

			return new Promise((fulfil, reject) => {
				signal.onabort = (e) => {
					console.log('aborted');
					reject(e.currentTarget.reason);
				};

				deferred.promise.then(fulfil, reject);
			});
		}

		$$renderer.push(`<button>reset</button> <button>resolve</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}