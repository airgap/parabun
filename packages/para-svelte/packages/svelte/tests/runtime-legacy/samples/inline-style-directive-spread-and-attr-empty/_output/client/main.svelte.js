import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let spread = $.prop($$props, 'spread', 28, () => ({ style: 'color: red;' }));
	let color = $.prop($$props, 'color', 12, null);
	let style = $.prop($$props, 'style', 12, 'color: blue');

	var $$exports = {
		get spread() {
			return spread();
		},

		set spread($$value) {
			spread($$value);
			$.flush();
		},

		get color() {
			return color();
		},

		set color($$value) {
			color($$value);
			$.flush();
		},

		get style() {
			return style();
		},

		set style($$value) {
			style($$value);
			$.flush();
		}
	};

	var p = root();

	$.attribute_effect(p, () => ({ ...spread(), style: style(), [$.STYLE]: { color: color() } }));
	$.append($$anchor, p);

	return $.pop($$exports);
}