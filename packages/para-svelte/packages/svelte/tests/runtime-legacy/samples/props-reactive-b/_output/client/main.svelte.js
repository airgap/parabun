import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	const c = $.mutable_source();
	let a = $.prop($$props, 'a', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(a()), $.deep_read_state($$sanitized_props)), () => {
		$.set(c, a() + $$sanitized_props.b);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2);

	$.reset(p_2);

	$.template_effect(() => {
		$.set_text(text, `a: ${a() ?? ''}`);

		$.set_text(text_1, `b: ${(
			$.deep_read_state($$sanitized_props),
			$.untrack(() => $$sanitized_props.b)
		) ?? ''}`);

		$.set_text(text_2, `c: ${$.get(c) ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}