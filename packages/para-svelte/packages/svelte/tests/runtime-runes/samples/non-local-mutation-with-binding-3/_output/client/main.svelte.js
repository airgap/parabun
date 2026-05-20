import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let object = $.tag_proxy($.proxy({ shared: { count: 0 }, notshared: { count: 0 } }), 'object');
	var $$exports = { ...$.legacy_api() };

	$.validate_binding('bind:shared={object.shared}', [], () => object, () => 'shared', 11, 1);

	$.add_svelte_meta(
		() => Counter($$anchor, {
			get notshared() {
				return object.notshared;
			},

			get shared() {
				return object.shared;
			},

			set shared($$value) {
				object.shared = $$value;
			}
		}),
		'component',
		Main,
		10,
		0,
		{ componentTag: 'Counter' }
	);

	return $.pop($$exports);
}