import * as $ from 'svelte/internal/server';
import { afterUpdate } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];
		let mirror;

		afterUpdate(() => {
			mirror = value;
		});

		$$renderer.push(`<p>${$.escape(value)}</p> <p>${$.escape(mirror)}</p>`);
		$.bind_props($$props, { value });
	});
}