import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Parent[$.FILENAME] = 'Parent.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Parent($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Parent);

	let test = $.prop($$props, 'test', 7);
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Child($$anchor, {
			get test() {
				return test();
			},

			set test($$value) {
				test($$value);
			}
		}),
		'component',
		Parent,
		8,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}