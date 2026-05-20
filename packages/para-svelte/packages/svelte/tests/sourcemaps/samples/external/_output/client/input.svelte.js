import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="awesome svelte-1owsd3p">Divs ftw!</div>`);

export default function Input($$anchor) {
	var div = root();

	$.append($$anchor, div);
}