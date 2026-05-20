import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const filesState = $.tag_proxy($.proxy({ files: {} }), 'filesState');
	let nodes = { id: 1, items: [{ id: 2, items: [{ id: 3 }, { id: 4 }] }] };

	filesState.files = nodes;

	function test() {
		return $.trace(() => 'test (main.svelte:5:4)', () => {
			filesState.files.items[0].parent = filesState.files;
		});
	}

	$.user_effect(test);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}