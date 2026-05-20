import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<option> </option>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

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

	var option = root();
	var text = $.child(option, true);

	$.reset(option);

	var option_value = {};

	$.template_effect(() => {
		$.set_text(text, foo());

		if (option_value !== (option_value = foo())) {
			option.value = (option.__value = foo()) ?? '';
		}
	});

	$.append($$anchor, option);

	return $.pop($$exports);
}