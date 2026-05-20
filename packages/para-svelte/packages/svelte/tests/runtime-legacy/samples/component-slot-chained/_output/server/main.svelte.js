import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';

export default function Main($$renderer, $$props) {
	let text = $.fallback($$props['text'], 'one');

	Outer($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->${$.escape(text)}`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { text });
}