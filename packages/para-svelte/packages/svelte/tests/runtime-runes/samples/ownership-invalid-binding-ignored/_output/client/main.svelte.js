import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Parent from './Parent.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let test = $.tag_proxy($.proxy({ test: '' }), 'test');
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Parent($$anchor, {
			get test() {
				return test;
			}
		}),
		'component',
		Main,
		6,
		0,
		{ componentTag: 'Parent' }
	);

	return $.pop($$exports);
}