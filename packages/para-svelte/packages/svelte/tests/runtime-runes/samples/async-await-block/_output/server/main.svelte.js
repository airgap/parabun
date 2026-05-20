import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var foo;
	var $$promises = $$renderer.run([async () => foo = await $.async_derived(() => 1)]);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		$.await($$renderer, foo(), () => {}, (x) => {
			$$renderer.push(`<p>${$.escape(x)}</p>`);
		});
	});

	$$renderer.push(`<!--]-->`);
}