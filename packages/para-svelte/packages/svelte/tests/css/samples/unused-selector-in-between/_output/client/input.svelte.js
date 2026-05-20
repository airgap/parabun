import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-xyz">h1</h1> <h2 class="svelte-xyz">h2</h2> <h3 class="svelte-xyz">h3</h3> <p class="svelte-xyz">p</p>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(6);
	$.append($$anchor, fragment);
}