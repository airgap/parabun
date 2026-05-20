import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Link from "./Link.svelte";

var root = $.from_html(`<!> <!> <!> <!>`, 1);

export default function Main($$anchor) {
	let foo = $.mutable_source([
		{ text: "foo0" },
		{ text: "foo1" },
		{ text: "foo2" },
		{ text: "foo3" }
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	Link(node, { item: { text: "foo" } });

	var node_1 = $.sibling(node, 2);

	Link(node_1, {
		get item() {
			return ($.get(foo), $.untrack(() => $.get(foo)[0]));
		}
	});

	var node_2 = $.sibling(node_1, 2);

	Link(node_2, {
		get item() {
			return $.get(foo)[0];
		},

		set item($$value) {
			$.mutate(foo, $.get(foo)[0] = $$value);
		},
		$$legacy: true
	});

	var node_3 = $.sibling(node_2, 2);

	$.each(node_3, 1, () => $.get(foo), $.index, ($$anchor, item, $$index) => {
		Link($$anchor, {
			get item() {
				return $.get(foo)[$$index];
			},

			set item($$value) {
				(
					$.get(foo)[$$index] = $$value,
					$.invalidate_inner_signals(() => ($.get(foo)))
				);
			},
			$$legacy: true
		});
	});

	$.append($$anchor, fragment);
}