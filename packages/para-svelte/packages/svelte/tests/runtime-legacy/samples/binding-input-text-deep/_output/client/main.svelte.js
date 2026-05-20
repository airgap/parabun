import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
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

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `hello ${($.deep_read_state(user()), $.untrack(() => user().name)) ?? ''}`));
	$.bind_value(input, () => user().name, ($$value) => user(user().name = $$value, true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}