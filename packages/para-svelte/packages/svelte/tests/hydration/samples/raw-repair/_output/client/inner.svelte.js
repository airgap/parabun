import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Inner($$anchor, $$props) {
	$.push($$props, false);

	let content = $.prop($$props, 'content', 12);

	var $$exports = {
		get content() {
			return content();
		},

		set content($$value) {
			content($$value);
			$.flush();
		}
	};

	var p = root();

	$.html(p, content, true);
	$.reset(p);
	$.append($$anchor, p);

	return $.pop($$exports);
}