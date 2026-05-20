import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="foo svelte-xyz">foo</p> <p class="bar svelte-xyz">bar <span class="svelte-xyz">baz</span></p> <span class="svelte-xyz">buzz</span>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(4);
	$.append($$anchor, fragment);
}