import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-xyz"><section><p class="svelte-xyz">this is styled</p></section></div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}