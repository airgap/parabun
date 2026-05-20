import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>foobar</div>`);

export default function Main($$anchor) {
	var div = root();

	$.append($$anchor, div);
}