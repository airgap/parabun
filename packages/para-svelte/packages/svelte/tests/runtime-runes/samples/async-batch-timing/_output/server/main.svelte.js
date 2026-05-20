import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

export default function Main($$renderer) {
	let ref = null;
	var foo;
	var $$promises = $$renderer.run([async () => foo = await $.async_derived(() => 1)]);

	$$renderer.push(`<div>div</div> `);
	Component($$renderer, { ref });
	$$renderer.push(`<!----> `);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (foo()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p></p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]-->`);
}