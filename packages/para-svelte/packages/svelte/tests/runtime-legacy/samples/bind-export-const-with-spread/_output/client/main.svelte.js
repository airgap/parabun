import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Test from "./Test.svelte";

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	let x = $.mutable_source();
	var fragment = root();
	var node = $.first_child(fragment);

	Test(node, $.spread_props({}, {
		get x() {
			return $.get(x);
		},

		set x($$value) {
			$.set(x, $$value);
		},
		$$legacy: true
	}));

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(x)));
	$.append($$anchor, fragment);
}