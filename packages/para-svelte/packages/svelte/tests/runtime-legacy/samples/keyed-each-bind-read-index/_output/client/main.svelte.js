import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	const items = $.mutable_source([0]);
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 3, () => $.get(items), (item) => item, ($$anchor, item, idx) => {
		Component($$anchor, {
			get item() {
				return $.get(items)[$.get(idx)];
			},

			set item($$value) {
				(
					$.get(items)[$.get(idx)] = $$value,
					$.invalidate_inner_signals(() => ($.get(items)))
				);
			},
			$$legacy: true
		});
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(items)));
	$.append($$anchor, fragment);
}