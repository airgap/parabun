import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="number"/> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${typeof count()} ${count() ?? ''}`));
	$.bind_value(input, count);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}