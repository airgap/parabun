import * as $ from 'svelte/internal/server';
import { get } from './get.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], get, true);

		$$renderer.push(`<span>${$.escape(foo)}</span>`);
		$.bind_props($$props, { foo });
	});
}