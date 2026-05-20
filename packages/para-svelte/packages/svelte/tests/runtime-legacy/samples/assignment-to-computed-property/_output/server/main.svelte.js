import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => ({}), true);
		let bar = 'baz';

		foo[bar] = 1;
		$.bind_props($$props, { foo });
	});
}