import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, "font-size: 20px; color: blue;");
	let baz = "red"; // static value
	let bar = "32"; // static value interpolated
	let bg = $.prop($$props, 'bg', 12, "gre" // dynamic value interpolated/cached
	);
	let borderColor = $.prop($$props, 'borderColor', 12, "green" // dynamic value non-cached
	);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bg() {
			return bg();
		},

		set bg($$value) {
			bg($$value);
			$.flush();
		},

		get borderColor() {
			return borderColor();
		},

		set borderColor($$value) {
			borderColor($$value);
			$.flush();
		}
	};

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, foo(), styles, {
		'font-size': '32px',
		color: baz,
		'background-color': `${bg() ?? ''}en`,
		'border-color': borderColor()
	}));

	$.append($$anchor, p);

	return $.pop($$exports);
}