import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div> </div> <button>Then click here</button>`, 1), Child[$.FILENAME], [[9, 0], [10, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let item = $.prop($$props, 'item', 7);

	function onclick() {
		$$ownership_validator.mutation('item', ['item', 'name'], item().name = `${item().name} edited`, 5, 2);
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div, true);

	$.reset(div);

	var button = $.sibling(div, 2);

	$.template_effect(() => $.set_text(text, item()?.name));
	$.delegated('click', button, onclick);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);