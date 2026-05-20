import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div> <div> </div> <div></div> <div></div>`, 1);

export default function App($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, ['b', 'a', 'c']);

	$.push($$props, false);

	const length = $.mutable_source();
	const values = $.mutable_source();
	let a = $.prop($$props, 'a', 12);

	function b() {}

	let c = $.prop($$props, 'c', 12, 1);

	$.legacy_pre_effect(() => ($.deep_read_state($$restProps)), () => {
		$.set(length, Object.keys($$restProps).length);
	});

	$.legacy_pre_effect(() => ($.deep_read_state($$restProps)), () => {
		$.set(values, Object.values($$restProps));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		b,
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1);

	$.reset(div_1);

	var div_2 = $.sibling(div_1, 2);

	$.attribute_effect(div_2, () => ({ ...$$restProps }));

	var div_3 = $.sibling(div_2, 2);

	$.attribute_effect(div_3, () => ({ ...$$sanitized_props }));

	$.template_effect(
		($0) => {
			$.set_text(text, `Length: ${$.get(length) ?? ''}`);
			$.set_text(text_1, `Values: ${$0 ?? ''}`);
		},
		[
			() => ($.get(values), $.untrack(() => $.get(values).join(',')))
		]
	);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'b', b);

	return $.pop($$exports);
}