import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<dialog class="svelte-xyz">Hello</dialog>`);

export default function Input($$anchor) {
	var dialog = root();

	$.append($$anchor, dialog);
}