import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Component2[$.FILENAME] = 'Component2.svelte';

import * as $ from 'svelte/internal/client';

export default function Component2($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Component2);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $$props.state));
	$.append($$anchor, text);

	return $.pop($$exports);
}