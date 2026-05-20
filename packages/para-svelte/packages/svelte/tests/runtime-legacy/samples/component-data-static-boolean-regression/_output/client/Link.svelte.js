import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<a>link</a>`);

export default function Link($$anchor, $$props) {
	$.push($$props, false);

	let href = $.prop($$props, 'href', 12);

	var $$exports = {
		get href() {
			return href();
		},

		set href($$value) {
			href($$value);
			$.flush();
		}
	};

	var a = root();

	$.template_effect(() => $.set_attribute(a, 'href', href()));
	$.append($$anchor, a);

	return $.pop($$exports);
}