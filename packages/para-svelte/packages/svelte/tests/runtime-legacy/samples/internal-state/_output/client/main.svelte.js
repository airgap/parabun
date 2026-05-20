import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root = $.from_html(`<!> <button>click me</button>`, 1);

export default function Main($$anchor) {
	let x = $.mutable_source(2);
	var fragment = root();
	var node = $.first_child(fragment);

	Foo(node, {
		get internal() {
			return $.get(x);
		}
	});

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(x, $.get(x) + 1));
	$.append($$anchor, fragment);
}