import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let test = $.tag_proxy($.proxy({ test: 'a' }), 'test');
	const store = writable(test);
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Child($$anchor, {
			get test() {
				return test;
			},

			get store() {
				return store;
			}
		}),
		'component',
		Main,
		9,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}