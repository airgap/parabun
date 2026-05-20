import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-xyz"><p class="svelte-xyz"></p></div>`);

export default function Input($$anchor) {
	var div = root();
	var p = $.child(div);

	$.html(p, () => whatever, true);
	$.reset(p);
	$.reset(div);
	$.append($$anchor, div);
}