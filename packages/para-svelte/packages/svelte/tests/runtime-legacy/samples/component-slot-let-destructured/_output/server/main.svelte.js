import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	Nested($$renderer, {
		things,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { thing: { num } }) => {
				$$renderer.push(`<span>${$.escape(num)}</span>`);
			}
		}
	});

	$.bind_props($$props, { things });
}