import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>hello</h1>`);

export default function Child($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}