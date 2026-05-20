import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p class="svelte-xyz">Paragraph 2</p>`);
var root = $.from_html(`<h1 class="svelte-xyz">Heading 1</h1> <span>Span 1</span> <span>Span 2</span> <!>`, 1);

export default function Input($$anchor, $$props) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 6);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}