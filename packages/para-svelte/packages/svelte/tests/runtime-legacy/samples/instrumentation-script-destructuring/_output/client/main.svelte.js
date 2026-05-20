import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>foo</button> <button>bar</button> <p> </p>`, 1);

export default function Main($$anchor) {
	let x = $.mutable_source(0);

	function foo() {
		(($$value) => {
			$.set(x, $$value.x);
		})({ x: 1 });
	}

	function bar() {
		(($$value) => {
			var $$array = $.to_array($$value, 1);

			$.set(x, $$array[0]);
		})([2]);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var p = $.sibling(button_1, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `x: ${$.get(x) ?? ''}`));
	$.event('click', button, foo);
	$.event('click', button_1, bar);
	$.append($$anchor, fragment);
}