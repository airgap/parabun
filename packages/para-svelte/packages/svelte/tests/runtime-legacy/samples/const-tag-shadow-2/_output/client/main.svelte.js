import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let array = $.prop($$props, 'array', 28, () => [1, 2, 3]);
	let baz = $.prop($$props, 'baz', 12, 3);
	const foo = (item) => item;

	var $$exports = {
		get array() {
			return array();
		},

		set array($$value) {
			array($$value);
			$.flush();
		},

		get baz() {
			return baz();
		},

		set baz($$value) {
			baz($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, array, $.index, ($$anchor, item) => {
		const bar = $.derived_safe_equal(() => (
			$.deep_read_state(array()),
			$.deep_read_state(baz()),
			$.untrack(() => array().map((item) => {
				const bar = baz();
				const foo = (item) => item * bar;

				return foo(item);
			}))
		));

		var fragment_1 = root_1();
		var p = $.first_child(fragment_1);
		var text = $.child(p, true);

		$.reset(p);

		var p_1 = $.sibling(p, 2);
		var text_1 = $.child(p_1, true);

		$.reset(p_1);

		$.template_effect(
			($0) => {
				$.set_text(text, $0);
				$.set_text(text_1, $.get(bar));
			},
			[() => ($.get(item), $.untrack(() => foo($.get(item))))]
		);

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}