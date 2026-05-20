import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let p = $.prop($$props, 'p', 12);

	var $$exports = {
		get p() {
			return p();
		},

		set p($$value) {
			p($$value);
			$.flush();
		}
	};

	var p_1 = root();
	var text = $.child(p_1, true);

	$.reset(p_1);
	$.template_effect(() => $.set_text(text, p()));
	$.append($$anchor, p_1);

	return $.pop($$exports);
}