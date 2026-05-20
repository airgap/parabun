import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let translate_x = $.prop($$props, 'translate_x', 12, "45px");
	let border_width = $.prop($$props, 'border_width', 12, 100);
	let border_color = $.prop($$props, 'border_color', 12);

	var $$exports = {
		get translate_x() {
			return translate_x();
		},

		set translate_x($$value) {
			translate_x($$value);
			$.flush();
		},

		get border_width() {
			return border_width();
		},

		set border_width($$value) {
			border_width($$value);
			$.flush();
		},

		get border_color() {
			return border_color();
		},

		set border_color($$value) {
			border_color($$value);
			$.flush();
		}
	};

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, '', styles, {
		color: "green",
		transform: `translateX(${translate_x() ?? ''})`,
		border: `${border_width() ?? ''}px solid ${(border_color() || 'pink') ?? ''}`
	}));

	$.append($$anchor, p);

	return $.pop($$exports);
}