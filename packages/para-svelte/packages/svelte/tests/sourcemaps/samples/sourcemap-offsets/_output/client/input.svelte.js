import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-zmwpq"><span class="svelte-zmwpq">Text</span></div>`);

export default function Input($$anchor) {
	var // This block is here to offset style block
	div = root();

	$.append($$anchor, div);
}