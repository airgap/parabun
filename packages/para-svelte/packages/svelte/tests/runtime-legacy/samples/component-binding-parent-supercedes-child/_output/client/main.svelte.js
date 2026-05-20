import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 10);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Counter(node, {
		get count() {
			return x();
		},

		set count($$value) {
			x($$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `count: ${x() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}