import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root = $.from_html(`<button> </button> <button> </button> <!>`, 1);

export default function Main($$anchor) {
	let a = $.mutable_source(0);
	let b = $.mutable_source(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	var node = $.sibling(button_1, 2);

	Child(node, {
		get a() {
			return $.get(a);
		},

		get b() {
			return $.get(b);
		}
	});

	$.template_effect(() => {
		$.set_text(text, `a: ${$.get(a) ?? ''}`);
		$.set_text(text_1, `b: ${$.get(b) ?? ''}`);
	});

	$.event('click', button, () => $.set(a, $.get(a) + 1));
	$.event('click', button_1, () => $.set(b, $.get(b) + 1));
	$.append($$anchor, fragment);
}