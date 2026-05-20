import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $$props.test));
	$.append($$anchor, text);

	return $.pop($$exports);
}