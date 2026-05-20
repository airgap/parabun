import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import "./Inner.svelte";

var root = $.from_html(`<button>inc</button> <my-inner></my-inner> <!>`, 3);

export default function Main($$anchor) {
	let count = $.mutable_source(1);
	var fragment = root();
	var button = $.first_child(fragment);
	var my_inner = $.sibling(button, 2);

	$.template_effect(() => $.set_custom_element_data(my_inner, 'value', $.get(count)));

	var node = $.sibling(my_inner, 2);

	$.each(node, 1, () => [$.get(count)], $.index, ($$anchor, row) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, $.get(row)));
		$.append($$anchor, text);
	});

	$.event('click', button, () => $.update(count));
	$.append($$anchor, fragment);
}