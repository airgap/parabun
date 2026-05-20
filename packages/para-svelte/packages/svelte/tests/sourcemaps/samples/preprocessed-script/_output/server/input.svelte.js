import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => ({ bar: { baz: 5 } }), true);

		$$renderer.push(`<h1 class="svelte-105rsgr">${$.escape(foo.bar.baz)}</h1>`);
		$.bind_props($$props, { foo });
	});
}