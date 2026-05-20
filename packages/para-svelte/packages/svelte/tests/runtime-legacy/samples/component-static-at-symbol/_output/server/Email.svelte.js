import * as $ from 'svelte/internal/server';

export default function Email($$renderer, $$props) {
	let address = $$props['address'];

	$$renderer.push(`<a${$.attr('href', `mailto:${$.stringify(address)}`)}>email</a>`);
	$.bind_props($$props, { address });
}