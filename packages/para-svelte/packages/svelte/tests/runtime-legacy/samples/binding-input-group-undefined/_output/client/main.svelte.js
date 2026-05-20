import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);
var root = $.from_html(`<input type="checkbox"/> <input type="checkbox"/> <input type="checkbox"/> <div></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let values = $.prop($$props, 'values', 28, () => ({ inner: [] }));

	var $$exports = {
		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	input.value = input.__value = 'first';

	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);
	input_1.value = input_1.__value = 'second';

	var input_2 = $.sibling(input_1, 2);

	$.remove_input_defaults(input_2);
	input_2.value = input_2.__value = 'third';

	var div = $.sibling(input_2, 2);

	$.each(div, 4, () => ['first', 'second', 'third'], $.index, ($$anchor, k) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, k));
		$.append($$anchor, span);
	});

	$.reset(div);
	$.bind_group(binding_group, [], input, () => values().inner, ($$value) => values(values().inner = $$value, true));
	$.bind_group(binding_group, [], input_1, () => values().inner, ($$value) => values(values().inner = $$value, true));
	$.bind_group(binding_group, [], input_2, () => values().inner, ($$value) => values(values().inner = $$value, true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}