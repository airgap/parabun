import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => []);
	let flag1 = $.prop($$props, 'flag1', 12, false);
	let flag2 = $.prop($$props, 'flag2', 12, false);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get flag1() {
			return flag1();
		},

		set flag1($$value) {
			flag1($$value);
			$.flush();
		},

		get flag2() {
			return flag2();
		},

		set flag2($$value) {
			flag2($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2, true);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_3 = $.child(p_3, true);

	$.reset(p_3);

	$.template_effect(
		($0) => {
			$.set_text(text, `${($.deep_read_state(items()), $.untrack(() => items().length)) ?? ''} items`);
			$.set_text(text_1, $0);
			$.set_text(text_2, flag1() ? "flagged (dynamic attribute)" : "not flagged");
			$.set_text(text_3, flag2() ? "flagged (static attribute)" : "not flagged");
		},
		[
			() => (
				$.deep_read_state(items()),
				$.untrack(() => items().join(", "))
			)
		]
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('my-widget', $.create_custom_element(_unknown_, { items: {}, flag1: {}, flag2: {} }, [], [], { mode: 'open' }));