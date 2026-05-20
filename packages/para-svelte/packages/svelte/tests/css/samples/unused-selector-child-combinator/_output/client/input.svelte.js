import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-xyz"><p class="svelte-xyz">Svelte REPLs are svelte.</p></div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}