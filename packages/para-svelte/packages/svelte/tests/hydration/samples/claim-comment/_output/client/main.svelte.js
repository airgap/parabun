import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!-- test1 --><!-- test2 --></div> <div><!-- test1 --><!-- test2 --></div>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var text = $.sibling($.first_child(fragment));

	text.nodeValue = ' p ';
	$.next();
	$.append($$anchor, fragment);
}