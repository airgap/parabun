import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="done_replace_style_2 svelte-1vsrjd4"></h1>`);

export default function Input($$anchor) {
	let done_replace_script_2 = 'hello';
	var h1 = root();

	h1.textContent = Math.random() < 1 && done_replace_script_2;
	$.append($$anchor, h1);
}