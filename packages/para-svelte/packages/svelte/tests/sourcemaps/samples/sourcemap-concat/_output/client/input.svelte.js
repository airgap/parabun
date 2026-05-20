import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello</h1>`);

export default function Input($$anchor) {
	console.log("Injected first line");
	console.log('Target');

	var h1 = root();

	$.append($$anchor, h1);
}