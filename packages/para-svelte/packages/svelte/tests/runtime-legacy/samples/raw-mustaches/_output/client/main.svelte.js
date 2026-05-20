import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`before<!>after`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let raw = $.prop($$props, 'raw', 12);

	var $$exports = {
		get raw() {
			return raw();
		},

		set raw($$value) {
			raw($$value);
			$.flush();
		}
	};

	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	$.html(node, raw);
	$.next();
	$.append($$anchor, fragment);

	return $.pop($$exports);
}