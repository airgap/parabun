import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import App from './App.svelte';

var root = $.from_html(`<button>increment</button> <!>`, 1);

export default function Main($$anchor) {
	let a = $.mutable_source(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	App(node, {
		get a() {
			return $.get(a);
		}
	});

	$.event('click', button, () => $.update(a));
	$.append($$anchor, fragment);
}