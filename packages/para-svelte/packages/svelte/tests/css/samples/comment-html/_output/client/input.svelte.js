import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-xyz">hello world</h1>`);

export default function Input($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}