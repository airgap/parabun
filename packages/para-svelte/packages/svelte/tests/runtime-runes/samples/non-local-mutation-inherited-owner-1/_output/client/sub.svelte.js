import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Sub[$.FILENAME] = 'sub.svelte';

import * as $ from 'svelte/internal/client';
import { getContext } from 'svelte';

var root = $.add_locations($.from_html(`<button> </button>`), Sub[$.FILENAME], [[7, 0]]);

export default function Sub($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Sub);

	const list = getContext('list');
	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(($0) => $.set_text(text, `[${$0 ?? ''}]`), [() => list.join(',')]);

	$.delegated('click', button, function click() {
		return list.push('foo');
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);