import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12);

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var button = root();

	$.attribute_effect(button, () => ({ ...props() }));
	$.append($$anchor, button);

	return $.pop($$exports);
}