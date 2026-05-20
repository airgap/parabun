import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><p data-foo="bar" class="svelte-xyz">this is styled</p> <p data-foo="bar-baz" class="svelte-xyz">this is styled</p> <p data-foo="baz-bar">this is unstyled</p></div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}