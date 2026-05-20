import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>click me</button> <!>`, 1);

export default function Main($$anchor) {
	let list = $.mutable_source([1, 2, 3]);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 1, () => $.get(list), $.index, ($$anchor, number) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(number)));
		$.append($$anchor, p);
	});

	$.event('click', button, (event) => {
		$.set(list, $.get(list).map((item) => {
			return item * 2;
		}));
	});

	$.append($$anchor, fragment);
}