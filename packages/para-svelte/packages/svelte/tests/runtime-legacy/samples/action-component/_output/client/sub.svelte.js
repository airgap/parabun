import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Sub($$anchor, $$props) {
	let action = $.prop($$props, 'action', 8);
	let state = $.prop($$props, 'state', 8);
	var div = root();

	$.action(div, ($$node, $$action_arg) => action()?.($$node, $$action_arg), state);
	$.append($$anchor, div);
}