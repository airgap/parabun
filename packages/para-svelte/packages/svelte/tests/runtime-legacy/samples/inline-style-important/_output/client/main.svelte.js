import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="svelte-70s021"> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let color = $.prop($$props, 'color', 28, () => `red`);

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
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(() => {
		$.set_style(p, `color: ${color() ?? ''} !important; font-size: 20px !important; opacity: 1;`);
		$.set_text(text, color());
	});

	$.append($$anchor, p);

	return $.pop($$exports);
}