import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component[$.FILENAME] = 'Component.svelte';

import * as $ from 'svelte/internal/client';
import Component2 from './Component2.svelte';

export default function Component($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component);

	function render(state) {
		return state;
	}

	var $$exports = { ...$.legacy_api() };

	{
		let $0 = $.derived(() => render($$props.state));

		$.add_svelte_meta(
			() => Component2($$anchor, {
				get state() {
					return $.get($0);
				}
			}),
			'component',
			Component,
			10,
			0,
			{ componentTag: 'Component2' }
		);
	}

	return $.pop($$exports);
}