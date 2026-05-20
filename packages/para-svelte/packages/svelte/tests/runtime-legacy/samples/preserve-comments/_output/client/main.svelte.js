import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>before</p> <!-- a comment --> <p>after</p>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.next(2);
	$.append($$anchor, fragment);
}