import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Counter[$.FILENAME] = 'Counter.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button> <button>reset</button>`, 1), Counter[$.FILENAME], [[5, 0], [8, 0]]);

export default function Counter($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Counter);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let object = $.prop($$props, 'object', 15);
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);

	$.template_effect(() => $.set_text(text, `clicks: ${object().count ?? ''}`));

	$.delegated('click', button, function click() {
		return $$ownership_validator.mutation('object', ['object', 'count'], object(object().count += 1, true), 5, 23);
	});

	$.delegated('click', button_1, function (...$$args) {
		$.apply(() => $$props.reset, this, $$args, Counter, [8, 17]);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);