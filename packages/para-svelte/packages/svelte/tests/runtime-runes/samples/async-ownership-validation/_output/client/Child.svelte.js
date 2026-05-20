import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Child[$.FILENAME], [[7, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let object = $.prop($$props, 'object', 7);
	var $$promises = $.run([async () => void (await $.track_reactivity_loss(1))()]);
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${object().count ?? ''}`));

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('object', ['object', 'count'], object().count++, 7, 23);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);