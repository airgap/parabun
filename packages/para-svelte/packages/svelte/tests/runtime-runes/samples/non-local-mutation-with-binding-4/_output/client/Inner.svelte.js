import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Inner[$.FILENAME] = 'Inner.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Inner[$.FILENAME], [[5, 0]]);

export default function Inner($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Inner);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let object = $.prop($$props, 'object', 15);
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${object().count ?? ''}`));

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('object', ['object', 'count'], object(object().count += 1, true), 5, 23);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);