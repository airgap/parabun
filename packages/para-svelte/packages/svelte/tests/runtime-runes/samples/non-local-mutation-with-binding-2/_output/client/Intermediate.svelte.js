import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Intermediate[$.FILENAME] = 'Intermediate.svelte';

import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

export default function Intermediate($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Intermediate);

	var $$ownership_validator = $.create_ownership_validator($$props);

	/** @type {{ object: { count: number }}} */
	let object = $.prop($$props, 'object', 7);

	var $$exports = { ...$.legacy_api() };

	{
		$$ownership_validator.binding('object', Counter, object);

		$.add_svelte_meta(
			() => Counter($$anchor, {
				get object() {
					return object();
				},

				set object($$value) {
					object($$value);
				}
			}),
			'component',
			Intermediate,
			8,
			0,
			{ componentTag: 'Counter' }
		);
	}

	return $.pop($$exports);
}