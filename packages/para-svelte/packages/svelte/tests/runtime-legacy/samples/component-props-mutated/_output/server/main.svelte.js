import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let data = $$props['data'];

		$$renderer.push(`<p>${$.escape(data.message)}</p>`);
		$.bind_props($$props, { data });
	});
}