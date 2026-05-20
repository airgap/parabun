import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function use() {
			return () => 1;
		}

		var name, aa;

		var $$promises = $$renderer.run([
			async () => name = await $.async_derived(() => new Promise((a) => a('aaa'))),
			() => aa = use()
		]);

		$$renderer.push(`<!---->`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(name())));

		$$renderer.push(`
`);

		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(aa())));
	});
}