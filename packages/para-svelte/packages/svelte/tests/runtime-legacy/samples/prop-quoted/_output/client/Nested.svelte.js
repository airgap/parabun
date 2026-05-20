import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);
	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, (
		$.deep_read_state($$sanitized_props),
		$.untrack(() => $$sanitized_props['x-y-z'])
	)));

	$.append($$anchor, text);
	$.pop();
}