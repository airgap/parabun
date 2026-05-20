import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="maybe-grid svelte-xyz">something with a nice layout</div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}