import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<details class="svelte-xyz">Hello</details>`);

export default function Input($$anchor) {
	var details = root();

	$.append($$anchor, details);
}