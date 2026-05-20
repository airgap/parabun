import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<h1 class="svelte-xyz">Heading 1</h1>`);
var root = $.from_html(`<!> <span>Span 1</span> <span>Span 2</span> <p class="svelte-xyz">Paragraph 2</p>`, 1);

export default function Input($$anchor, $$props) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var h1 = root_1();

		$.append($$anchor, h1);
	});

	$.next(6);
	$.append($$anchor, fragment);
}