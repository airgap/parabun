import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input type="checkbox"/><p> </p></div>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);
	let numCompleted = $.prop($$props, 'numCompleted', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(items())), () => {
		numCompleted(items().reduce(
			(total, item) => {
				return total + (item.completed ? 1 : 0);
			},
			0
		));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get numCompleted() {
			return numCompleted();
		},

		set numCompleted($$value) {
			numCompleted($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item, $$index) => {
		var div = root_1();
		var input = $.child(div);

		$.remove_input_defaults(input);

		var p = $.sibling(input);
		var text = $.child(p, true);

		$.reset(p);
		$.reset(div);
		$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).description))));

		$.bind_checked(input, () => $.get(item).completed, ($$value) => (
			$.get(item).completed = $$value,
			$.invalidate_inner_signals(() => (items()))
		));

		$.append($$anchor, div);
	});

	var p_1 = $.sibling(node, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);
	$.template_effect(() => $.set_text(text_1, `${numCompleted() ?? ''} completed`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}