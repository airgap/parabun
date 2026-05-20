import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);
	setContext('a', 1);
	setContext('b', 2);
	setContext('c', 3);
	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, null);
	$.append($$anchor, fragment);
	$.pop();
}