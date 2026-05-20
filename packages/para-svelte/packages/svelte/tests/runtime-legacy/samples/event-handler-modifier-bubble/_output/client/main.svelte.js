import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Button from "./button.svelte";

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let default_was_prevented = $.prop($$props, 'default_was_prevented', 12);

	function handle_click(event) {
		default_was_prevented(event.defaultPrevented);
	}

	var $$exports = {
		get default_was_prevented() {
			return default_was_prevented();
		},

		set default_was_prevented($$value) {
			default_was_prevented($$value);
			$.flush();
		}
	};

	Button($$anchor, { $$events: { click: handle_click } });

	return $.pop($$exports);
}