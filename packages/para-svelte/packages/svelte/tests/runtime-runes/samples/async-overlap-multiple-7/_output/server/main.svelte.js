import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;

		function delay(value) {
			if (!value) return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		var b, c, d, deferred;

		var $$promises = $$renderer.run([
			async () => b = await $.async_derived(() => delay(a * 2)),
			() => c = 0,
			async () => d = await $.async_derived(() => delay(b() + c)),
			() => deferred = []
		]);

		$$renderer.push(`<!---->a `);
		$$renderer.async([$$promises[2]], ($$renderer) => $$renderer.push(() => $.escape(a)));
		$$renderer.push(` | b `);
		$$renderer.async([$$promises[2]], ($$renderer) => $$renderer.push(() => $.escape(b())));
		$$renderer.push(` | c `);
		$$renderer.async([$$promises[2]], ($$renderer) => $$renderer.push(() => $.escape(c)));
		$$renderer.push(` | d `);
		$$renderer.async([$$promises[2]], ($$renderer) => $$renderer.push(() => $.escape(d())));
		$$renderer.push(` <button>a++</button> <button>c++</button> <button>shift</button> <button>pop</button>`);
	});
}