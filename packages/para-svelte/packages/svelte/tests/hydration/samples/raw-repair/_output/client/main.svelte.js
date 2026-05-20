import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from './inner.svelte';

var root = $.from_html(`<!> <p></p>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	Inner(node, { content: '<p>invalid</p>' });

	var p = $.sibling(node, 2);

	$.html(p, () => '<p>invalid</p>', true);
	$.reset(p);
	$.append($$anchor, fragment);
}