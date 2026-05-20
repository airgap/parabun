import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<h1> </h1> <button>+1</button> <button>reset</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get($.get(foo), '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let foo = $.mutable_source(writable(0));

	$.init();

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1, true);

	$.reset(h1);

	var button = $.sibling(h1, 2);
	var button_1 = $.sibling(button, 2);

	$.template_effect(() => $.set_text(text, $foo()));
	$.event('click', button, () => $.get(foo).update((n) => n + 1));
	$.event('click', button_1, () => $.store_unsub($.set(foo, writable(0)), '$foo', $$stores));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}