import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1> <input/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let component = $.prop($$props, 'component', 12);

	var $$exports = {
		get component() {
			return component();
		},

		set component($$value) {
			component($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1);

	$.reset(h1);

	var input = $.sibling(h1, 2);

	$.remove_input_defaults(input);

	$.template_effect(() => $.set_text(text, `Hello ${(
		$.deep_read_state(component()),
		$.untrack(() => component().name)
	) ?? ''}!`));

	$.bind_value(input, () => component().name, ($$value) => component(component().name = $$value, true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}