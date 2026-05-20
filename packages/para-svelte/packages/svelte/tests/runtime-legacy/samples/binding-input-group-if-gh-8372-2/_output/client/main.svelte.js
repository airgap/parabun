import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<label>b <input type="radio"/></label>`);
var root = $.from_html(`<button> </button> <label>a <input type="radio"/></label> <!> <label>c <input value="just here, so b is not the last input"/></label>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let test = $.prop($$props, 'test', 12);
	let hidden = $.mutable_source(false);

	var $$exports = {
		get test() {
			return test();
		},

		set test($$value) {
			test($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var label = $.sibling(button, 2);
	var input = $.sibling($.child(label));

	$.remove_input_defaults(input);
	input.value = input.__value = 'a';
	$.reset(label);

	var node = $.sibling(label, 2);

	{
		var consequent = ($$anchor) => {
			var label_1 = root_1();
			var input_1 = $.sibling($.child(label_1));

			$.remove_input_defaults(input_1);
			input_1.value = input_1.__value = 'b';
			$.reset(label_1);
			$.bind_group(binding_group, [], input_1, test, test);
			$.append($$anchor, label_1);
		};

		$.if(node, ($$render) => {
			if (!$.get(hidden)) $$render(consequent);
		});
	}

	$.next(2);
	$.template_effect(() => $.set_text(text, `${$.get(hidden) ? "show" : "hide"} b`));
	$.event('click', button, () => $.set(hidden, !$.get(hidden)));
	$.bind_group(binding_group, [], input, test, test);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}