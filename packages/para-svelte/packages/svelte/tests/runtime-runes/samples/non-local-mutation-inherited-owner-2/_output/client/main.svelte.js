import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Sub from './sub.svelte';
import { create_my_state } from './state.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const myState = create_my_state();
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Sub($$anchor, {
			get count() {
				return myState.my_state;
			},

			get inc() {
				return myState.inc;
			}
		}),
		'component',
		Main,
		8,
		0,
		{ componentTag: 'Sub' }
	);

	return $.pop($$exports);
}