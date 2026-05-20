import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tagName = $.fallback($$props['tagName'], 'dynamic-element');

	$.element($$renderer, tagName, void 0, () => {
		$$renderer.push(`<header slot="header">header header header</header>`);
	});

	$.bind_props($$props, { tagName });
}