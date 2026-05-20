import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello world!</h1>`);

export default function Component($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}