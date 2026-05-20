import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<div> <!></div>`), Child[$.FILENAME], [[5, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	let prop = $.prop($$props, 'prop', 3, '');
	var $$exports = { ...$.legacy_api() };
	var div = root();
	var text = $.child(div, true);
	var node = $.sibling(text);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', Child, 5, 11);
	$.reset(div);
	$.template_effect(() => $.set_text(text, prop()));
	$.append($$anchor, div);

	return $.pop($$exports);
}