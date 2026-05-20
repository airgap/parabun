import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Pre[$.FILENAME] = 'pre.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<pre><!></pre>`), Pre[$.FILENAME], [[5, 0]]);

export default function Pre($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Pre);

	var $$exports = { ...$.legacy_api() };
	var pre = root();
	var node = $.child(pre);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', Pre, 5, 5);
	$.reset(pre);
	$.append($$anchor, pre);

	return $.pop($$exports);
}