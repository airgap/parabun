import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let dynamic = $$props['dynamic'];

	$$renderer.push(`<span class="foo svelte-xyz"><span class="bar svelte-xyz">text</span></span> <span class="foo svelte-xyz"><span class="bar svelte-xyz">${$.escape(dynamic)}</span></span>`);
	$.bind_props($$props, { dynamic });
}