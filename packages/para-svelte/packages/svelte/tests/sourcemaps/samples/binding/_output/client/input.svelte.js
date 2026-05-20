import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	$.init();

	var input = root();

	$.remove_input_defaults(input);
	$.bind_value(input, () => foo().bar.baz, ($$value) => foo(foo().bar.baz = $$value, true));
	$.append($$anchor, input);
	$.pop();
}