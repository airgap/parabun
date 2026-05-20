import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, void 0, [() => 'hello'], (node, $0) => {
		$.slot(
			node,
			$$props,
			'default',
			{
				get message() {
					return $.get($0);
				}
			},
			null
		);
	});

	$.append($$anchor, fragment);
}