import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { createRawSnippet } from 'svelte';

var root = $.add_locations($.from_html(`<button>click</button> <!>`, 1), Main[$.FILENAME], [[18, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = $.tag($.state(0), 'count');

	const hello = createRawSnippet((count) => ({
		render: () => `
			<p>clicks: ${count()}</p>
		`,

		setup(p) {
			$.user_effect(() => {
				p.textContent = `clicks: ${count()}`;
			});
		}
	}));

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.add_svelte_meta(() => hello(node, () => $.get(count)), 'render', Main, 20, 0);

	$.delegated('click', button, function click() {
		return $.set(count, $.get(count) + 1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);