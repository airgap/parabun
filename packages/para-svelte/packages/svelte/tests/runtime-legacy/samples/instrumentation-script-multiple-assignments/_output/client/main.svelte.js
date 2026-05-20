import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>click me</button> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);

	function click() {
		foo(4);
		bar(2);
	}

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `foo: ${foo() ?? ''}`);
		$.set_text(text_1, `bar: ${bar() ?? ''}`);
	});

	$.event('click', button, click);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}