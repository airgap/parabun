import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Sub[$.FILENAME] = 'sub.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <button> </button>`, 1), Sub[$.FILENAME], [[5, 0], [6, 0]]);

export default function Sub($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Sub);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let count = $.prop($$props, 'count', 15);
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, `${count().a ?? ''} (ok)`);
		$.set_text(text_1, `${count().a ?? ''} (bad)`);
	});

	$.delegated('click', button, function (...$$args) {
		$.apply(() => $$props.inc, this, $$args, Sub, [5, 17]);
	});

	$.delegated('click', button_1, function click() {
		return $$ownership_validator.mutation('count', ['count', 'a'], count(count().a++, true), 6, 23);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);