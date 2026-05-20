import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let dynamic = $$props['dynamic'];

	$$renderer.push(`<div><p${$.attr('data-foo', dynamic)} class="svelte-xyz">this is styled</p> <p data-foo="baz">this is unstyled</p></div>`);
	$.bind_props($$props, { dynamic });
}