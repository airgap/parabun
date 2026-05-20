import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Outer[$.FILENAME] = 'Outer.svelte';

import * as $ from 'svelte/internal/client';

export default function Outer($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Outer);

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children ?? $.noop), 'render', Outer, 5, 0);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}