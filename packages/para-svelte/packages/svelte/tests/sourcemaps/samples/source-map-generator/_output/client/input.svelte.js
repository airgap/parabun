import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-1faep76">Testing Styles</h1> <h2 class="svelte-1faep76">Testing Styles 2</h2>`, 1);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	const b = 2;
	var $$exports = { b };
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'b', b);

	return $.pop($$exports);
}