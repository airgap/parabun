import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let letters = $.fallback($$props['letters'], () => ['a', 'b', 'c'], true);

		Nested($$renderer, {
			items: letters,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { index }) => {
					$$renderer.push(`<label>${$.escape(index + 1)}: <input${$.attr('value', letters[index])}/></label>`);
				}
			}
		});

		$.bind_props($$props, { letters });
	});
}