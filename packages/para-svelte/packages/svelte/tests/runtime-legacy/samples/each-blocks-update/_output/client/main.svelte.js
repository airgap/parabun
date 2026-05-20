import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	let arr = $.mutable_source([1, 2, 3]);
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(arr), $.index, ($$anchor, n, $$index) => {
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.template_effect(() => $.set_text(text, $.get(arr)[$$index]));

		$.event('click', button, () => (
			$.get(arr)[$$index]++,
			$.invalidate_inner_signals(() => ($.get(arr)))
		));

		$.append($$anchor, button);
	});

	var p = $.sibling(node, 2);
	var text_1 = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text_1, $0), [() => ($.get(arr), $.untrack(() => $.get(arr).join(', ')))]);
	$.append($$anchor, fragment);
}