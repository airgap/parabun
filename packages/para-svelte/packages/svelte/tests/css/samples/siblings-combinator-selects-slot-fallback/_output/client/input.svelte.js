import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span class="svelte-xyz">Hello</span>`);
var root = $.from_html(`<h1 class="svelte-xyz">test</h1> <!>`, 1);

export default function Input($$anchor, $$props) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var span = root_1();

		$.append($$anchor, span);
	});

	$.append($$anchor, fragment);
}