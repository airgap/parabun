import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="svelte-70s021">red</p>`);

export default function Main($$anchor) {
	var p = root();

	$.append($$anchor, p);
}