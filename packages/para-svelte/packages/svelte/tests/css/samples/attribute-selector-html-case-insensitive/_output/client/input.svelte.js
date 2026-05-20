import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<form method="GET" class="svelte-xyz"><h1 class="svelte-xyz">Hello</h1></form> <form method="POST" class="svelte-xyz"><h1 class="svelte-xyz">World</h1></form> <input type="Text" class="svelte-xyz"/>`, 1);

export default function Input($$anchor) {
	var fragment = root();

	$.next(4);
	$.append($$anchor, fragment);
}