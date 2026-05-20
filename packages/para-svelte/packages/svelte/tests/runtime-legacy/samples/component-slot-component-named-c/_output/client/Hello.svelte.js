import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span>Hello</span>`);

export default function Hello($$anchor) {
	var span = root();

	$.append($$anchor, span);
}