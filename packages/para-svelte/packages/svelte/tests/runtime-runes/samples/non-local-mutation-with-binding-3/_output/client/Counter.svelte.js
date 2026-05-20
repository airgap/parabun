import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Counter[$.FILENAME] = 'Counter.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <button> </button>`, 1), Counter[$.FILENAME], [[6, 0], [10, 0]]);

export default function Counter($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Counter);

	var $$ownership_validator = $.create_ownership_validator($$props);

	/** @type {{ shared: { count: number }, notshared: { count: number } }} */
	let shared = $.prop($$props, 'shared', 15),
		notshared = $.prop($$props, 'notshared', 7);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, `clicks: ${shared().count ?? ''}`);
		$.set_text(text_1, `clicks: ${notshared().count ?? ''}`);
	});

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('shared', ['shared', 'count'], shared(shared().count += 1, true), 6, 23);
	});

	$.delegated('click', button_1, function click_1() {
		return $$ownership_validator.mutation('notshared', ['notshared', 'count'], notshared().count += 1, 10, 23);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);