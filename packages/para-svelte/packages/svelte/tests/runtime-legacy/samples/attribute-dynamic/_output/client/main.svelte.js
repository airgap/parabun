import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

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

	var div = root();
	var text = $.child(div, true);

	$.reset(div);

	$.template_effect(() => {
		$.set_style(div, `color: ${color() ?? ''};`);
		$.set_text(text, color());
	});

	$.append($$anchor, div);

	return $.pop($$exports);
}