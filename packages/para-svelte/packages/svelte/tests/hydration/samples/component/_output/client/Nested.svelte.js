import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>nested</p>`);

export default function Nested($$anchor) {
	var p = root();

	$.append($$anchor, p);
}