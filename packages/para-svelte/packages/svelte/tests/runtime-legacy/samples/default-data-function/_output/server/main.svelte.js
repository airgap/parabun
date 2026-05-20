import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let name = $.fallback($$props['name'], () => 'world');

		$$renderer.push(`<h1>Hello ${$.escape(name())}!</h1>`);
		$.bind_props($$props, { name });
	});
}