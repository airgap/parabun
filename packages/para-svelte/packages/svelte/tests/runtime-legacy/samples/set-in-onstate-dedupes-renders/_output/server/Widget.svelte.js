import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $$props['foo'];
		let bar = $$props['bar'];

		$: {
			if (foo.x !== bar.x) {
				throw new Error('mismatch');
			}
		}

		$$renderer.push(`<div>${$.escape(foo.x)}</div>`);
		$.bind_props($$props, { foo, bar });
	});
}