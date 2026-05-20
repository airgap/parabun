import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>hello</p>`);

export default function Child($$anchor) {
	var p = root();

	$.append($$anchor, p);
}