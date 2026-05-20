import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <button>update</button>`, 1);

export default function App($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	$.legacy_pre_effect(() => ($.deep_read_state($$sanitized_props)), () => {
		$$sanitized_props.a = $$sanitized_props.a * 2;
	});

	$.legacy_pre_effect_reset();
	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var button = $.sibling(p, 2);

	$.template_effect(() => $.set_text(text, `${(
		$.deep_read_state($$sanitized_props),
		$.untrack(() => $$sanitized_props.a)
	) ?? ''} ${(
		$.deep_read_state($$sanitized_props),
		$.untrack(() => $$sanitized_props.b)
	) ?? ''}`));

	$.event('click', button, () => $$sanitized_props.b = 'b');
	$.append($$anchor, fragment);
	$.pop();
}