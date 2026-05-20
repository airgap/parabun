import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1> <h1> </h1> <h1> </h1> <h1> </h1> <h1> </h1> <h1> </h1> <h1> </h1> <h1> </h1>`, 1);

export default function Main($$anchor) {
	let [first, second, ...[third, ...[, fifth]]] = [1, 2, 3, 4, 5];
	let [one, two, ...[three, ...{ length }]] = [10, 20, 30, 40, 50, 60, 70, 80, 90];
	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1, true);

	$.reset(h1);

	var h1_1 = $.sibling(h1, 2);
	var text_1 = $.child(h1_1, true);

	$.reset(h1_1);

	var h1_2 = $.sibling(h1_1, 2);
	var text_2 = $.child(h1_2, true);

	$.reset(h1_2);

	var h1_3 = $.sibling(h1_2, 2);
	var text_3 = $.child(h1_3, true);

	$.reset(h1_3);

	var h1_4 = $.sibling(h1_3, 2);
	var text_4 = $.child(h1_4, true);

	$.reset(h1_4);

	var h1_5 = $.sibling(h1_4, 2);
	var text_5 = $.child(h1_5, true);

	$.reset(h1_5);

	var h1_6 = $.sibling(h1_5, 2);
	var text_6 = $.child(h1_6, true);

	$.reset(h1_6);

	var h1_7 = $.sibling(h1_6, 2);
	var text_7 = $.child(h1_7, true);

	$.reset(h1_7);

	$.template_effect(() => {
		$.set_text(text, first);
		$.set_text(text_1, second);
		$.set_text(text_2, third);
		$.set_text(text_3, fifth);
		$.set_text(text_4, one);
		$.set_text(text_5, two);
		$.set_text(text_6, three);
		$.set_text(text_7, length);
	});

	$.append($$anchor, fragment);
}