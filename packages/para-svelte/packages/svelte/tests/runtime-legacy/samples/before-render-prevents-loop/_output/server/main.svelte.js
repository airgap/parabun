import * as $ from 'svelte/internal/server';
import { beforeUpdate } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];
		let mirror;

		beforeUpdate(() => {
			mirror = value;
		});

		$$renderer.push(`<p>${$.escape(value)}</p> <p>${$.escape(mirror)}</p>`);
		$.bind_props($$props, { value });
	});
}