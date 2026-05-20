import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $$props['foo'];
		let click_handler = $$props['click_handler'];

		$$renderer.push(`<button>${$.escape(click_handler)}</button>`);
		$.bind_props($$props, { foo, click_handler });
	});
}