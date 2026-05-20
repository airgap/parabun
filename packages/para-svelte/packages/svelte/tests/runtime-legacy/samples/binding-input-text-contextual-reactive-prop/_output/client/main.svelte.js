import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input type="checkbox"/> <input type="text"/> <p> </p></div>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const done = $.mutable_source();
	const remaining = $.mutable_source();
	const filtered = $.mutable_source();
	const summary = $.mutable_source();
	let items = $.prop($$props, 'items', 12);
	let filter = $.prop($$props, 'filter', 12, 'all');

	$.legacy_pre_effect(() => ($.deep_read_state(items())), () => {
		$.set(done, items().filter((item) => item.done));
	});

	$.legacy_pre_effect(() => ($.deep_read_state(items())), () => {
		$.set(remaining, items().filter((item) => !item.done));
	});

	$.legacy_pre_effect(
		() => (
			$.deep_read_state(filter()),
			$.deep_read_state(items()),
			$.get(done),
			$.get(remaining)
		),
		() => {
			$.set(filtered, filter() === 'all'
				? items()
				: filter() === 'done' ? $.get(done) : $.get(remaining));
		}
	);

	$.legacy_pre_effect(() => ($.deep_read_state(items())), () => {
		$.set(summary, items().map((i) => `${i.done ? 'done' : 'remaining'}:${i.text}`).join(' / '));
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

		get filter() {
			return filter();
		},

		set filter($$value) {
			filter($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(filtered), $.index, ($$anchor, item, $$index) => {
		var div = root_1();
		var input = $.child(div);

		$.remove_input_defaults(input);

		var input_1 = $.sibling(input, 2);

		$.remove_input_defaults(input_1);

		var p = $.sibling(input_1, 2);
		var text = $.child(p, true);

		$.reset(p);
		$.reset(div);
		$.template_effect(() => $.set_text(text, ($.get(item), $.untrack(() => $.get(item).text))));

		$.bind_checked(input, () => $.get(item).done, ($$value) => (
			$.get(item).done = $$value,
			$.invalidate_inner_signals(() => (
				$.get(filtered),
				filter(),
				items(),
				$.get(done),
				$.get(remaining)
			))
		));

		$.bind_value(input_1, () => $.get(item).text, ($$value) => (
			$.get(item).text = $$value,
			$.invalidate_inner_signals(() => (
				$.get(filtered),
				filter(),
				items(),
				$.get(done),
				$.get(remaining)
			))
		));

		$.append($$anchor, div);
	});

	var p_1 = $.sibling(node, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);
	$.template_effect(() => $.set_text(text_1, $.get(summary)));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}