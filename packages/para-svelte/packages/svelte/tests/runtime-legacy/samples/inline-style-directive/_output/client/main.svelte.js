import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><p></p></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let myColor = $.prop($$props, 'myColor', 12, "red");

	var $$exports = {
		get myColor() {
			return myColor();
		},

		set myColor($$value) {
			myColor($$value);
			$.flush();
		}
	};

	var div = root();
	var p = $.child(div);
	let styles;

	$.reset(div);
	$.template_effect(() => styles = $.set_style(p, '', styles, { color: myColor() }));
	$.append($$anchor, div);

	return $.pop($$exports);
}