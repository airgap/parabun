import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor) {
	const foo = ['a', 'b', 'c'];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($.untrack(() => [...foo])), $.index, ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
}