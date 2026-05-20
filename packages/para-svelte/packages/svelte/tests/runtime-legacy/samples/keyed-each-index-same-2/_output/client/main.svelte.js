import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ["a", "b"], $.index, ($$anchor, result, i) => {
		var div = root_1();

		div.textContent = i;
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
}