import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tag = $.fallback($$props['tag'], 'div');

	$.element($$renderer, tag, void 0, () => {
		$$renderer.push(`Foo`);
	});

	$.bind_props($$props, { tag });
}