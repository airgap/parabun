import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="svelte-xyz">this may or may not be styled</p>`);

export default function Input($$anchor) {
	var p = root();

	$.append($$anchor, p);
}