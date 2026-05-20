import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Test from './Test.svelte';

var root = $.from_html(`<button></button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let counter = $.mutable_source(1);
	let store = $.mutable_source(writable($.get(counter)));

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Test(node, {
		get store() {
			return $.get(store);
		}
	});

	$.event('click', button, () => $.set(store, writable($.update_pre(counter))));
	$.append($$anchor, fragment);
	$.pop();
}