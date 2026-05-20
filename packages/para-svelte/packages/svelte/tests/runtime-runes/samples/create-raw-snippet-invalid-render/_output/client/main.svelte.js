import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { createRawSnippet } from 'svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const snippet = createRawSnippet(() => ({
		render: () => `
			<!-- --><div>123</div>
		`
	}));

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(() => snippet($$anchor), 'render', Main, 11, 0);

	return $.pop($$exports);
}