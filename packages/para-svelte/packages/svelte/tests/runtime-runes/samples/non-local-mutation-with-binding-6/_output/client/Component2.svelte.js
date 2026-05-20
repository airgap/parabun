import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component2[$.FILENAME] = 'Component2.svelte';

import * as $ from 'svelte/internal/client';

export default function Component2($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component2);

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', Component2, 5, 0);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}