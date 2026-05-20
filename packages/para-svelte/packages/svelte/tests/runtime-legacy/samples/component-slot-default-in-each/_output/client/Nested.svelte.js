import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <!>`, 1);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let promise = new Promise((resolve) => resolve(10));

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ({ length: 3 }), $.index, ($$anchor, _, i) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.slot(node_1, $$props, 'default', { item: i }, null);
		$.append($$anchor, fragment_1);
	});

	var node_2 = $.sibling(node, 2);

	$.await(node_2, () => promise, null, ($$anchor, value) => {
		var fragment_2 = $.comment();
		var node_3 = $.first_child(fragment_2);

		$.slot(
			node_3,
			$$props,
			'default',
			{
				get value() {
					return $.get(value);
				}
			},
			null
		);

		$.append($$anchor, fragment_2);
	});

	$.append($$anchor, fragment);
	$.pop();
}