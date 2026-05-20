import * as $ from 'svelte/internal/server';

export default function TextInput($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	let actualValue = $$props['actualValue'];
	let x = $$sanitized_props;

	$$renderer.push(`<input${$.attr('value', actualValue)}/>`);
	$.bind_props($$props, { actualValue });
}