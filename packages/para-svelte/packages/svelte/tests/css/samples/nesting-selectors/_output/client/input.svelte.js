import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<header class="svelte-xyz"><nav class="active svelte-xyz"></nav></header>`);

export default function Input($$anchor) {
	var header = root();

	$.append($$anchor, header);
}