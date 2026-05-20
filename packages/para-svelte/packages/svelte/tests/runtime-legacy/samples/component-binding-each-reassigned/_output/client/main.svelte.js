import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<p> </p> <!> <p> </p>`, 1);

export default function Main($$anchor) {
	let numbers = $.mutable_source([1, 2, 3]);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var node = $.sibling(p, 2);

	$.each(node, 1, () => $.get(numbers), $.index, ($$anchor, n, $$index) => {
		Child($$anchor, {
			get value() {
				return $.get(numbers)[$$index];
			},

			set value($$value) {
				(
					$.get(numbers)[$$index] = $$value,
					$.invalidate_inner_signals(() => ($.get(numbers)))
				);
			},
			$$legacy: true
		});
	});

	var p_1 = $.sibling(node, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $0);
			$.set_text(text_1, $1);
		},
		[
			() => ($.get(numbers), $.untrack(() => $.get(numbers).join(', '))),
			() => ($.get(numbers), $.untrack(() => $.get(numbers).join(', ')))
		]
	);

	$.append($$anchor, fragment);
}