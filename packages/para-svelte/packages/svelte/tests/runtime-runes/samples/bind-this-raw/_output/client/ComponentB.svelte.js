import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>b</div>`);

export default function ComponentB($$anchor) {
	var div = root();

	$.append($$anchor, div);
}