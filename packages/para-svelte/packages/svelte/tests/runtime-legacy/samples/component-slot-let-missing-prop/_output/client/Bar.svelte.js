import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Bar($$anchor, $$props) {
	$.push($$props, false);

	let thing = $.prop($$props, 'thing', 12);

	var $$exports = {
		get thing() {
			return thing();
		},

		set thing($$value) {
			thing($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, thing()));
	$.append($$anchor, p);

	return $.pop($$exports);
}