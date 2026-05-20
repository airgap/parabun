import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Inner[$.FILENAME] = 'inner.svelte';

import * as $ from 'svelte/internal/client';

export default function Inner($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Inner);

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children, () => true), 'render', Inner, 5, 0);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}