import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<button> </button> <button>click handler marks foo as reactive</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get($.get(foo), '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	let tmp = (() => {
			const foo = writable(false);

			return { foo, toggleFoo: () => foo.update((f) => !f) };
		})(),
		foo = $.mutable_source(tmp.foo),
		toggleFoo = tmp.toggleFoo;

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);

	$.template_effect(() => $.set_text(text, $foo()));
	$.event('click', button, toggleFoo);
	$.event('click', button_1, () => $.store_unsub($.set(foo, null), '$foo', $$stores));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}