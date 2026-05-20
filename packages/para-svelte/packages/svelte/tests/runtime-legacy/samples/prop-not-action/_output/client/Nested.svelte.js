import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let user = $.prop($$props, 'user', 12);

	var $$exports = {
		get user() {
			return user();
		},

		set user($$value) {
			user($$value);
			$.flush();
		}
	};

	$.init();

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `Hello ${($.deep_read_state(user()), $.untrack(() => user().name)) ?? ''}!`));
	$.append($$anchor, h1);

	return $.pop($$exports);
}