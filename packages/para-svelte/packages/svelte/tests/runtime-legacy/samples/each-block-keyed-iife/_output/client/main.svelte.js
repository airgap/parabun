import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const arr = [1, 2, 3];

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => arr, (item) => (() => item)(), ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.pop();
}