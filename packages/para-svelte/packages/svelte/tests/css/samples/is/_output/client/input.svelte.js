import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<x class="svelte-xyz"><y class="svelte-xyz"><z class="svelte-xyz"></z></y></x>`);

export default function Input($$anchor) {
	var x = root();

	$.append($$anchor, x);
}