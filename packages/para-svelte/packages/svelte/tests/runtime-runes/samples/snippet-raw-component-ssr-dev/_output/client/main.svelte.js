import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { createRawSnippet, hydrate } from 'svelte';
import { render } from 'svelte/server';
import Child from './Child.svelte';

var root = $.add_locations($.from_html(`<div><!></div>`), Main[$.FILENAME], [[20, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count = 0;

	const hello = createRawSnippet((count) => ({
		render: () => `
			<div>${$$props.browser ? '' : render(Child).body}</div>
		`,

		setup(target) {
			hydrate(Child, { target });
		}
	}));

	var $$exports = { ...$.legacy_api() };
	var div = root();
	var node = $.child(div);

	$.add_svelte_meta(() => hello(node), 'render', Main, 21, 1);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}