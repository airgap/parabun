import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Unrendered_children[$.FILENAME] = 'unrendered-children.svelte';

import * as $ from 'svelte/internal/client';

export default function Unrendered_children($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Unrendered_children);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $$props.children));
	$.append($$anchor, text);

	return $.pop($$exports);
}