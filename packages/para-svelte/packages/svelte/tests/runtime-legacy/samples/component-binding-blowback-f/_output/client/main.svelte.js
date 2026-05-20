import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import One from "./One.svelte";

var root = $.from_html(`<!> <!> <p> </p> <p> </p>`, 1);

export default function Main($$anchor) {
	const obj = $.mutable_source({ a: [{}], b: [] });
	var fragment = root();
	var node = $.first_child(fragment);

	One(node, {
		i: 0,
		get list() {
			return $.get(obj).a;
		},

		set list($$value) {
			$.mutate(obj, $.get(obj).a = $$value);
		},
		$$legacy: true
	});

	var node_1 = $.sibling(node, 2);

	One(node_1, {
		i: 1,
		get list() {
			return $.get(obj).b;
		},

		set list($$value) {
			$.mutate(obj, $.get(obj).b = $$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node_1, 2);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $0);
			$.set_text(text_1, $1);
		},
		[
			() => (
				$.get(obj),
				$.untrack(() => $.get(obj).a.map(JSON.stringify))
			),

			() => (
				$.get(obj),
				$.untrack(() => $.get(obj).b.map(JSON.stringify))
			)
		]
	);

	$.append($$anchor, fragment);
}