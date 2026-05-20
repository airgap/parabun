import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>Sub</div>`);

export default function Sub($$anchor) {
	var div = root();

	$.append($$anchor, div);
}