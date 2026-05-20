import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>hi</div>`);
var root_2 = $.from_html(`<div></div>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 16, () => [10, 20], $.index, ($$anchor, $$item) => {
		var div = root_1();

		$.append($$anchor, div);
	});

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 16, () => [10, 20], $.index, ($$anchor, $$item, i) => {
		var div_1 = root_2();

		div_1.textContent = i;
		$.append($$anchor, div_1);
	});

	$.append($$anchor, fragment);
}