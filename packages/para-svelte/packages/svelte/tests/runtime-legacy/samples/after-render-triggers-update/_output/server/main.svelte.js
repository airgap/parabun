import * as $ from 'svelte/internal/server';
import { afterUpdate } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $$props['a'];
		let b = $$props['b'];
		let value = $$props['value'];

		afterUpdate(() => {
			b.textContent = a.textContent;
		});

		$$renderer.push(`<p>${$.escape(value)}</p> <p></p>`);
		$.bind_props($$props, { a, b, value });
	});
}