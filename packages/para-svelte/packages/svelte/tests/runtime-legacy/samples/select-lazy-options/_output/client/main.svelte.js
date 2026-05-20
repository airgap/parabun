import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root_2 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select> <select></select> <button>Load options</button>`, 1);

export default function Main($$anchor) {
	let value = 'bar';
	let value_bound = $.mutable_source('bar');
	let options = $.mutable_source({});

	function loadOptions() {
		$.set(options, { foo: 'Foo', bar: 'Bar', baz: 'Baz' });
	}

	var fragment = root();
	var select = $.first_child(fragment);

	$.each(
		select,
		5,
		() => (
			$.get(options),
			$.untrack(() => Object.entries($.get(options)))
		),
		([key, value]) => key,
		($$anchor, $$item, $$index, $$array) => {
			var $$array_1 = $.derived(() => $.to_array($.get($$item), 2));
			let key = () => $.get($$array_1)[0];
			let value = () => $.get($$array_1)[1];
			var option = root_1();
			var text = $.child(option, true);

			$.reset(option);

			var option_value = {};

			$.template_effect(() => {
				$.set_text(text, value());

				if (option_value !== (option_value = key())) {
					option.value = (option.__value = key()) ?? '';
				}
			});

			$.append($$anchor, option);
		}
	);

	$.reset(select);

	(
		select.value = select.__value = value,
		$.select_option(select, value)
	);

	$.init_select(select);

	var select_1 = $.sibling(select, 2);

	$.each(
		select_1,
		5,
		() => (
			$.get(options),
			$.untrack(() => Object.entries($.get(options)))
		),
		([key, value]) => key,
		($$anchor, $$item, $$index_1, $$array_2) => {
			var $$array_3 = $.derived(() => $.to_array($.get($$item), 2));
			let key = () => $.get($$array_3)[0];
			let value = () => $.get($$array_3)[1];
			var option_1 = root_2();
			var text_1 = $.child(option_1, true);

			$.reset(option_1);

			var option_1_value = {};

			$.template_effect(() => {
				$.set_text(text_1, value());

				if (option_1_value !== (option_1_value = key())) {
					option_1.value = (option_1.__value = key()) ?? '';
				}
			});

			$.append($$anchor, option_1);
		}
	);

	$.reset(select_1);

	var button = $.sibling(select_1, 2);

	$.bind_select_value(select_1, () => $.get(value_bound), ($$value) => $.set(value_bound, $$value));
	$.event('click', button, loadOptions);
	$.append($$anchor, fragment);
}