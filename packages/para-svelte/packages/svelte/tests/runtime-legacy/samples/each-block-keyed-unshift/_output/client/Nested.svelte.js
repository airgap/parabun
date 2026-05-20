import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let title = $.prop($$props, 'title', 12);

	var $$exports = {
		get title() {
			return title();
		},

		set title($$value) {
			title($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, title()));
	$.append($$anchor, p);

	return $.pop($$exports);
}