import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="radio"/> <input type="radio"/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	input.value = input.__value = false;

	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);
	input_1.value = input_1.__value = true;

	$.bind_group(
		binding_group,
		[],
		input,
		() => {
			false;

			return foo();
		},
		foo
	);

	$.bind_group(
		binding_group,
		[],
		input_1,
		() => {
			true;

			return foo();
		},
		foo
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}