import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

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

	var button = root();

	$.event('click', button, $.preventDefault(handle_click));
	$.append($$anchor, button);

	return $.pop($$exports);
}