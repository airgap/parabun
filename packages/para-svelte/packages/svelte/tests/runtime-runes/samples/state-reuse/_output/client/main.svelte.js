import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let foo = { value: 'a' };
	let state1 = $.tag($.state($.proxy(foo)), 'state1');
	let state2 = $.tag($.state($.proxy(foo)), 'state2');
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);

	$.template_effect(() => $.set_text(text, `state1.value: ${// This contains Symbol.$state and Symbol.$readonly and we can't do anything against it,
	// because it's called on the original object, not our state proxy
	// $.proxy will see that Symbol.$state exists on this object already, which shouldn't result in a stale value
	// $.proxy can't look into Symbol.$state because of the frozen object
	$.get(state1).value ?? ''}
state2.value: ${$.get(state2).value ?? ''}`));

	$.delegated('click', button, function click() {
		let new_state1 = {};
		let new_state2 = {};

		// This contains Symbol.$state and Symbol.$readonly and we can't do anything against it,
		// because it's called on the original object, not our state proxy
		Reflect.ownKeys(foo).forEach((k) => {
			new_state1[k] = foo[k];
			new_state2[k] = foo[k];
		});

		new_state1.value = 'b';
		new_state2.value = 'b';

		// $.proxy will see that Symbol.$state exists on this object already, which shouldn't result in a stale value
		$.set(state1, new_state1, true);

		// $.proxy can't look into Symbol.$state because of the frozen object
		$.set(state2, Object.freeze(new_state2), true);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);