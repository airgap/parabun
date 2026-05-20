import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function RenderProps($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state($$sanitized_props),
			$.untrack(() => JSON.stringify($$sanitized_props))
		)
	]);

	$.append($$anchor, p);
}