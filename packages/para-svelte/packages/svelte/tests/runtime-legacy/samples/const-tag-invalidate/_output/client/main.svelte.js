import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> <button>Toggle</button></div>`);

export default function Main($$anchor) {
	let items = $.mutable_source([
		{ name: 'A', selected: true },
		{ name: 'B', selected: false },
		{ name: 'C', selected: false }
	]);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(items), $.index, ($$anchor, item, $$index) => {
		const toggle = $.derived_safe_equal(() => () => (
			$.get(item).selected = !$.get(item).selected,
			$.invalidate_inner_signals(() => ($.get(items)))
		));

		var div = root_1();
		var text = $.child(div);
		var button = $.sibling(text);

		$.reset(div);

		$.template_effect(() => $.set_text(text, `${(
			$.get(item),
			$.untrack(() => $.get(item).selected ? '[Y]' : '[N]')
		) ?? ''}
		${($.get(item), $.untrack(() => $.get(item).name)) ?? ''} `));

		$.event('click', button, function (...$$args) {
			$.get(toggle)?.apply(this, $$args);
		});

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
}