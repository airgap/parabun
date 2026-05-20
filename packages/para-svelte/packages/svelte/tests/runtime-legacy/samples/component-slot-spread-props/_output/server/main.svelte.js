import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], '');

	Nested($$renderer, {
		class: 'foo',
		children: ($$renderer) => {
			$$renderer.push(`<input${$.attr('value', value)}/>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { value });
}