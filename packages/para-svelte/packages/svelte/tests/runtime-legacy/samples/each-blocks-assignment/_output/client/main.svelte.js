import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span class="content"> </span> <button>Test</button>`, 1);
var root = $.from_html(`<button>Add</button> <!>`, 1);

export default function Main($$anchor) {
	let obj = { prop: "foo" };
	let arr = $.mutable_source([1, 2, 3]);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 1, () => $.get(arr), $.index, ($$anchor, o, $$index) => {
		var fragment_1 = root_1();
		var span = $.first_child(fragment_1);
		var text = $.child(span, true);

		$.reset(span);

		var button_1 = $.sibling(span, 2);

		$.template_effect(() => $.set_text(text, $.get(arr)[$$index]));

		$.event('click', button_1, () => {
			(
				$.get(arr)[$$index] = $.get(arr)[$$index] * 2,
				$.invalidate_inner_signals(() => ($.get(arr)))
			);
		});

		$.append($$anchor, fragment_1);
	});

	$.event('click', button, () => $.set(arr, [...$.get(arr), $.get(arr).length + 1]));
	$.append($$anchor, fragment);
}