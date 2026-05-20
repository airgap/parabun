import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option>a</option><option>b</option></select>`);

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

	var select = root();
	var select_value;

	$.init_select(select);

	$.template_effect(() => {
		if (select_value !== (select_value = foo())) {
			(
				select.value = (select.__value = foo()) ?? '',
				$.select_option(select, foo())
			);
		}
	});

	$.append($$anchor, select);

	return $.pop($$exports);
}