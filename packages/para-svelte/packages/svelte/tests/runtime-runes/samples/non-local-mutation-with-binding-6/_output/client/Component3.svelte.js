import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component3[$.FILENAME] = 'Component3.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Component3[$.FILENAME], [[5, 0]]);

export default function Component3($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component3);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let count = $.prop($$props, 'count', 15);
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, count().value));

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('count', ['count', 'value'], count(count().value++, true), 5, 23);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);