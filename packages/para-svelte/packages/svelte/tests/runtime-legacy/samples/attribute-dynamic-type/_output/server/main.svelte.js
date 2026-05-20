import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let inputType = $$props['inputType'];
	let inputValue = $$props['inputValue'];

	$$renderer.push(`<input${$.attr('type', inputType)}${$.attr('value', inputValue)}/>`);
	$.bind_props($$props, { inputType, inputValue });
}