import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1></h1> <img src="..." loading="lazy"/>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var img = $.sibling($.first_child(fragment), 2);

	$.append($$anchor, fragment);
}