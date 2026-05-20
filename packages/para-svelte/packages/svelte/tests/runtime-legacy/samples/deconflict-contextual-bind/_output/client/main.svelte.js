import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor) {
	const values = $.mutable_source(['foo', 'bar']);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(values), $.index, ($$anchor, value, $$index) => {
		Widget($$anchor, {
			get value() {
				return $.get(values)[$$index];
			},

			set value($$value) {
				(
					$.get(values)[$$index] = $$value,
					$.invalidate_inner_signals(() => ($.get(values)))
				);
			},
			$$legacy: true
		});
	});

	$.append($$anchor, fragment);
}