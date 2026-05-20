import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-xyz"><span class="svelte-xyz">text</span> <div class="svelte-xyz">text</div></div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}