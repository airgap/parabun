import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Bar($$anchor, $$props) {
	$.push($$props, false);

	let y = $.prop($$props, 'y', 12, 'bar');

	var $$exports = {
		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `y: ${y() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}