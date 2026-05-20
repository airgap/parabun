import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Child[$.FILENAME], [[8, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	const $attrs = () => (
		$.validate_store($$props.attrs, 'attrs'),
		$.store_get($$props.attrs, '$attrs', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();

	function increment() {
		$.store_mutate($$props.attrs, $.untrack($attrs).count++, $.untrack($attrs));
	}

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $attrs().count));
	$.delegated('click', button, increment);
	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);