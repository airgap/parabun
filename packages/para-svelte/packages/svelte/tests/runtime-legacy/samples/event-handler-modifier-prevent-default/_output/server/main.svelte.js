import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let default_was_prevented = $$props['default_was_prevented'];

	function handle_click(event) {
		default_was_prevented = event.defaultPrevented;
	}

	$$renderer.push(`<button>click me</button>`);
	$.bind_props($$props, { default_was_prevented });
}