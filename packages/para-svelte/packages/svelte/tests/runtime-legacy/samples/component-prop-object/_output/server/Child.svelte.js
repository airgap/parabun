import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];

		$$renderer.push(`<!---->child: ${$.escape(x.y)}`);
		$.bind_props($$props, { x });
	});
}