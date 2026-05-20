import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<a class="svelte-xyz"><b class="svelte-xyz"><c class="svelte-xyz"><span class="svelte-xyz">Big red Comic Sans</span> <span class="foo svelte-xyz">Big red Comic Sans</span></c></b></a>`);

export default function Input($$anchor) {
	var a = root();

	$.append($$anchor, a);
}