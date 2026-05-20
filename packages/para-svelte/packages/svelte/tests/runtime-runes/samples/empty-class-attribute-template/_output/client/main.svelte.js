import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div> <div></div>`, 1);

export default function Main($$anchor) {
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
}