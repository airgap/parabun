import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<main class="svelte-xyz"><div class="svelte-xyz"><button type="submit" class="svelte-xyz">Blue</button></div></main>`);

export default function Input($$anchor) {
	var main = root();

	$.append($$anchor, main);
}