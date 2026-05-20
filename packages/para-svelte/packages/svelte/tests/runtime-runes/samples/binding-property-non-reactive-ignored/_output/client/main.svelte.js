import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let arr = [];
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.component(node, () => undefined, ($$anchor, $$component) => {
			$.bind_this($$component($$anchor, {}), ($$value) => arr[0] = $$value, () => arr?.[0]);
		}),
		'component',
		Main,
		6,
		0,
		{ componentTag: 'svelte:component' }
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}