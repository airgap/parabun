import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Intermediate from './Intermediate.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let object = $.tag_proxy($.proxy({ count: 0 }), 'object');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Intermediate($$anchor, {
			get object() {
				return object;
			}
		}),
		'component',
		Main,
		7,
		0,
		{ componentTag: 'Intermediate' }
	);

	return $.pop($$exports);
}