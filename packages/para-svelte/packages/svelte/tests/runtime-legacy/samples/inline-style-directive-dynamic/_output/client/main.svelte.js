import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

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

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, '', styles, { color: myColor() }));
	$.append($$anchor, p);

	return $.pop($$exports);
}