import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<a>email</a>`);

export default function Email($$anchor, $$props) {
	$.push($$props, false);

	let address = $.prop($$props, 'address', 12);

	var $$exports = {
		get address() {
			return address();
		},

		set address($$value) {
			address($$value);
			$.flush();
		}
	};

	var a = root();

	$.template_effect(() => $.set_attribute(a, 'href', `mailto:${address() ?? ''}`));
	$.append($$anchor, a);

	return $.pop($$exports);
}