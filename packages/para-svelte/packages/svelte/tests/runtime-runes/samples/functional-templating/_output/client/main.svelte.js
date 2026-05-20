import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_tree([['p', null, 'hello']]);

export default function Main($$anchor) {
	var p = root();

	$.append($$anchor, p);
}