import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	let keys = ['a', 'b'];

	function setKey(key, value) {
		console.log(`setKey(${key}, ${value})`);
	}

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => keys, (key) => key, ($$anchor, key) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.slot(
			node_1,
			$$props,
			'default',
			{
				get key() {
					return $.get(key);
				},
				set: (value) => setKey($.get(key), value)
			},
			null
		);

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}