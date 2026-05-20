import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let color = $.prop($$props, 'color', 12, 'red');

	var $$exports = {
		get color() {
			return color();
		},

		set color($$value) {
			color($$value);
			$.flush();
		}
	};

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, 'height: 40px;', styles, { color: color() }));
	$.append($$anchor, p);

	return $.pop($$exports);
}