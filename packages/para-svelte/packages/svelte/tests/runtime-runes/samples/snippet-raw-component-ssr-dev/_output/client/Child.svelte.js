import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Child[$.FILENAME], [[5, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	let count = $.tag($.state(0), 'count');
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${$.get(count) ?? ''}`));

	$.delegated('click', button, function click() {
		return $.set(count, $.get(count) + 1);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);