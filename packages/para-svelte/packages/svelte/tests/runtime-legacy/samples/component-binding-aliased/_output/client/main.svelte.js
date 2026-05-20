import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<!> <div> </div>`, 1);

export default function Main($$anchor) {
	let bar = $.mutable_source();
	var fragment = root();
	var node = $.first_child(fragment);

	Widget(node, {
		get bar() {
			return $.get(bar);
		},

		set bar($$value) {
			$.set(bar, $$value);
		},
		$$legacy: true
	});

	var div = $.sibling(node, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, $.get(bar)));
	$.append($$anchor, fragment);
}