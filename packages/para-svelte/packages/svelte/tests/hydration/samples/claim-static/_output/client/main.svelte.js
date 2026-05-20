import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>hello</div> <div><div>bye</div></div> <div><div>aaa</div> <div>bbb</div></div>`, 1);

export default function Main($$anchor) {
	var fragment = root();

	$.next(4);
	$.append($$anchor, fragment);
}