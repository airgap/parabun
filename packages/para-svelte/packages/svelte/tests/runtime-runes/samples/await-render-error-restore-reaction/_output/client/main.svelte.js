import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button></button> <!>`, 1), Main[$.FILENAME], [[17, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	function listen(node) {
		function handler() {
			$.update(count);
		}

		node.addEventListener("click", handler);

		return {
			destroy() {
				node.removeEventListener("click", handler);
			}
		};
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);

	$.action(button, ($$node) => listen?.($$node));

	var node_1 = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.await(node_1, () => Promise.resolve(), null, ($$anchor) => {
			var text = $.text();

			text.nodeValue = err.or;
			$.append($$anchor, text);
		}),
		'await',
		Main,
		19,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}