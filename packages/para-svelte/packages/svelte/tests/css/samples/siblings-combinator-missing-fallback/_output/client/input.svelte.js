import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<y>fallback content</y>`);
var root = $.from_html(`<x class="svelte-xyz"></x> <!> <z class="svelte-xyz">this should be green if the slot fallback is not rendered</z>`, 1);

export default function Input($$anchor, $$props) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var y = root_1();

		$.append($$anchor, y);
	});

	$.next(2);
	$.append($$anchor, fragment);
}