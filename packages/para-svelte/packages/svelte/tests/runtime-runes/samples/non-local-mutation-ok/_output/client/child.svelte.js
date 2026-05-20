import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>mutate</button>`), Child[$.FILENAME], [[5, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$ownership_validator = $.create_ownership_validator($$props);

	let klass = $.prop($$props, 'klass', 7),
		getter_setter = $.prop($$props, 'getter_setter', 7);

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, function click() {
		$$ownership_validator.mutation('klass', ['klass', 'y'], klass().y = 2, 6, 1);
		$$ownership_validator.mutation('getter_setter', ['getter_setter', 'y'], getter_setter().y = 2, 7, 1);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);