import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<h1 class="svelte-xyz">test</h1>`);
var root = $.from_html(`<!> <span class="svelte-xyz">Hello</span>`, 1);

export default function Input($$anchor, $$props) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var h1 = root_1();

		$.append($$anchor, h1);
	});

	$.next(2);
	$.append($$anchor, fragment);
}