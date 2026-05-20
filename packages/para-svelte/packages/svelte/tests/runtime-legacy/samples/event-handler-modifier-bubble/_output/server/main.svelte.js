import * as $ from 'svelte/internal/server';
import Button from "./button.svelte";

export default function Main($$renderer, $$props) {
	let default_was_prevented = $$props['default_was_prevented'];

	function handle_click(event) {
		default_was_prevented = event.defaultPrevented;
	}

	Button($$renderer, {});
	$.bind_props($$props, { default_was_prevented });
}