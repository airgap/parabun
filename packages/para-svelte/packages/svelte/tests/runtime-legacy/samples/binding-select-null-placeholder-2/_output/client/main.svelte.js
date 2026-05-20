import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select><option></option><!></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var select = root();
	var option = $.child(select);

	option.value = (option.__value = null) ?? '';

	var node = $.sibling(option);

	$.each(node, 1, items, $.index, ($$anchor, item) => {
		var option_1 = root_1();
		var text = $.child(option_1, true);

		$.reset(option_1);

		var option_1_value = {};

		$.template_effect(() => {
			$.set_text(text, ($.get(item), $.untrack(() => $.get(item).id)));

			if (option_1_value !== (option_1_value = $.get(item))) {
				option_1.value = (option_1.__value = $.get(item)) ?? '';
			}
		});

		$.append($$anchor, option_1);
	});

	$.reset(select);
	$.bind_select_value(select, foo);
	$.append($$anchor, select);

	return $.pop($$exports);
}