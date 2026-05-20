import * as $ from 'svelte/internal/server';
import { addCss, addedCss, applyComputations, renderMainFragment } from './module.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $.fallback($$props['value'], addCss + addedCss + applyComputations + renderMainFragment);

		function compute() {
			return value.toUpperCase();
		}

		$$renderer.push(`<!---->${$.escape(compute())}`);
		$.bind_props($$props, { value, compute });
	});
}