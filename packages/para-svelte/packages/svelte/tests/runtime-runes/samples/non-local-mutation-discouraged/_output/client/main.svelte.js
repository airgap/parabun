import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let object = $.tag($.state($.proxy({ count: 0 })), 'object');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Counter($$anchor, {
			get object() {
				return $.get(object);
			},
			reset: () => $.set(object, { count: 0 }, true)
		}),
		'component',
		Main,
		7,
		0,
		{ componentTag: 'Counter' }
	);

	return $.pop($$exports);
}