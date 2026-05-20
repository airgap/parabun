import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Counter[$.FILENAME] = 'Counter.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Counter[$.FILENAME], [[6, 0]]);

export default function Counter($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Counter);

	var $$ownership_validator = $.create_ownership_validator($$props);

	/** @type {{ object: { count: number }}} */
	let object = $.prop($$props, 'object', 15);

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${object().count ?? ''}`));

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('object', ['object', 'count'], object(object().count += 1, true), 6, 23);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);