import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Nested($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	let props = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state($$sanitized_props)), () => {
		let { foo, bar, baz, ...others } = $$sanitized_props;

		$.set(props, others);
	});

	$.legacy_pre_effect_reset();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, ($.get(props), $.untrack(() => $.get(props).qux))));
	$.append($$anchor, p);
	$.pop();
}