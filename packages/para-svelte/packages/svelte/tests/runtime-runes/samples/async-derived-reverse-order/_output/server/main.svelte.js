import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let deferreds = [];

		class X {
			constructor(promise) {
				this.promise = promise;
			}

			get then() {
				count;

				return (resolve) => this.promise.then(() => count).then(resolve);
			}
		}

		function push() {
			const deferred = Promise.withResolvers();

			deferreds.push(deferred);

			return new X(deferred.promise);
		}

		$$renderer.push(`<button>increment</button> <button>pop</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}