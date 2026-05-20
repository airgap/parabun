import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let value = '';
		let resolver;

		function asd(v) {
			let r = Promise.withResolvers();

			function update_and_resolve() {
				count++;
				r.resolve(v);
			}

			// make sure the second promise resolve before the first one
			if (resolver) {
				new Promise((r) => {
					setTimeout(r);
				}).then(update_and_resolve).then(() => {
					setTimeout(() => {
						resolver();
						resolver = null;
					});
				});
			} else if (v) {
				resolver = update_and_resolve;
			} else {
				Promise.resolve().then(update_and_resolve);
			}

			return r.promise;
		}

		var x;
		var $$promises = $$renderer.run([async () => x = await $.async_derived(() => asd(value))]);

		$$renderer.async([$$promises[0]], ($$renderer) => {
			$$renderer.push(`<input${$.attr('value', value)}/>`);
		});

		$$renderer.push(` `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(count)));
		$$renderer.push(` | `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(x())));
	});
}