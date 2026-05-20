import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<option> </option>`);
var root = $.from_html(`<select></select>`);

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

	$.each(select, 5, items, $.index, ($$anchor, item) => {
		var option = root_1();
		var text = $.child(option, true);

		$.reset(option);

		var option_value = {};

		$.template_effect(() => {
			$.set_text(text, ($.get(item), $.untrack(() => $.get(item).id)));

			if (option_value !== (option_value = ($.get(item), $.untrack(() => $.get(item).id)))) {
				option.value = (option.__value = ($.get(item), $.untrack(() => $.get(item).id))) ?? '';
			}
		});

		$.append($$anchor, option);
	});

	$.reset(select);
	$.bind_select_value(select, foo);
	$.append($$anchor, select);

	return $.pop($$exports);
}