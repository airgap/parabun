import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_1 = $.from_html(` <div></div>`, 1);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	const binding_group = [];
	let group = $.mutable_source([]);
	const options = [["1", ["1a", "1b"]], ["2", ["2a", "2b"]]];
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => options, $.index, ($$anchor, $$item) => {
		var $$array = $.derived(() => $.to_array($.get($$item), 2));
		let prefix = () => $.get($$array)[0];
		let arr = () => $.get($$array)[1];

		$.next();

		var fragment_1 = root_1();
		var text = $.first_child(fragment_1);
		var div = $.sibling(text);

		$.each(div, 5, arr, $.index, ($$anchor, item) => {
			var label = root_2();
			var input = $.child(label);

			$.remove_input_defaults(input);

			var input_value;
			var text_1 = $.sibling(input);

			$.reset(label);

			$.template_effect(() => {
				if (input_value !== (input_value = $.get(item))) {
					input.value = (input.__value = $.get(item)) ?? '';
				}

				$.set_text(text_1, ` ${$.get(item) ?? ''}`);
			});

			$.bind_group(
				binding_group,
				[],
				input,
				() => {
					$.get(item);

					return $.get(group);
				},
				($$value) => $.set(group, $$value)
			);

			$.append($$anchor, label);
		});

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${prefix() ?? ''} `));
		$.append($$anchor, fragment_1);
	});

	var p = $.sibling(node, 2);
	var text_2 = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text_2, $0), [
		() => ($.get(group), $.untrack(() => JSON.stringify($.get(group))))
	]);

	$.append($$anchor, fragment);
}