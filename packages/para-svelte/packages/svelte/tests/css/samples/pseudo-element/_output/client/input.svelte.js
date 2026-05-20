import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span class="svelte-xyz"></span>`);

export default function Input($$anchor) {
	var span = root();

	$.append($$anchor, span);
}