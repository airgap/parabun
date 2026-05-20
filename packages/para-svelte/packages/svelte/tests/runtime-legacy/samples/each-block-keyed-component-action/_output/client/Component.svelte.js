import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let action = $.prop($$props, 'action', 12);

	var $$exports = {
		get action() {
			return action();
		},

		set action($$value) {
			action($$value);
			$.flush();
		}
	};

	var div = root();

	$.action(div, ($$node) => action()?.($$node));
	$.append($$anchor, div);

	return $.pop($$exports);
}