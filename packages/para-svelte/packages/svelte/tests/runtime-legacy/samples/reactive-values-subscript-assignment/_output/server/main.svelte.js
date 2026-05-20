import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => ({}), true);
		let bar = $$props['bar'];

		$: if (bar) {
			foo[bar] = true;
		}

		$.bind_props($$props, { foo, bar });
	});
}