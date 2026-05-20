import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let arr = $.tag_proxy($.proxy([]), 'arr');
	let arr2 = $.tag_proxy($.proxy([]), 'arr2');
	let len = $.tag($.derived(() => arr.length + arr2.length), 'len');
	var $$exports = { ...$.legacy_api() };
	var bind_get = () => $.strict_equals($.get(len) % 2, 0) ? arr : arr2;
	var bind_set = (v) => {};

	$.add_svelte_meta(
		() => Child($$anchor, {
			get arr() {
				return bind_get();
			},

			set arr($$value) {
				bind_set($$value);
			}
		}),
		'component',
		Main,
		10,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}