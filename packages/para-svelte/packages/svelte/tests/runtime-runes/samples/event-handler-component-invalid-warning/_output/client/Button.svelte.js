import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Button[$.FILENAME] = 'Button.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button><!></button>`), Button[$.FILENAME], [[5, 0]]);

export default function Button($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Button);

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var node = $.child(button);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', Button, 6, 1);
	$.reset(button);

	$.delegated('click', button, function (...$$args) {
		$.apply(() => $$props.onclick, this, $$args, Button, [5, 9]);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);