import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>hello world</h1>`);

export default function Input($$anchor) {
	var h1 = root();

	$.set_class(h1, 1, $.clsx([foo]), 'svelte-xyz');
	$.append($$anchor, h1);
}