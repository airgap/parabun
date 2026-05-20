import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Parent[$.FILENAME] = 'Parent.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

export default function Parent($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Parent);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let test = $.prop($$props, 'test', 31, () => $.tag_proxy($.proxy({}), 'test'));
	var $$exports = { ...$.legacy_api() };

	{
		$$ownership_validator.binding('test', Child, test);

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
			7,
			0,
			{ componentTag: 'Child' }
		);
	}

	return $.pop($$exports);
}