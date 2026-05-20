import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tag = $.fallback($$props['tag'], "div");
	let text = $.fallback($$props['text'], "Foo");

	$.element($$renderer, tag, void 0, () => {
		$$renderer.push(`${$.escape(text)}`);
	});

	$.bind_props($$props, { tag, text });
}