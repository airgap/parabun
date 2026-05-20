import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $$props['value'];

	function uppercase(event) {
		event.target.value = event.target.value.toUpperCase();
	}

	$$renderer.push(`<input${$.attr('value', value)}/> <p>${$.escape(value)}</p>`);
	$.bind_props($$props, { value });
}