import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let click_handler = $.prop($$props, 'click_handler', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get click_handler() {
			return click_handler();
		},

		set click_handler($$value) {
			click_handler($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, click_handler()));
	$.event('click', button, () => foo()());
	$.append($$anchor, button);

	return $.pop($$exports);
}