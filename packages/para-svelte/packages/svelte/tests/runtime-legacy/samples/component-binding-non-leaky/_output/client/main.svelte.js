import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	let x = $.mutable_source();
	var fragment = root();
	var node = $.first_child(fragment);

	Counter(node, {
		get count() {
			return $.get(x);
		},

		set count($$value) {
			$.set(x, $$value);
		},
		$$legacy: true
	});

	var p = $.sibling(node, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `count: ${$.get(x) ?? ''}`));
	$.append($$anchor, fragment);
}