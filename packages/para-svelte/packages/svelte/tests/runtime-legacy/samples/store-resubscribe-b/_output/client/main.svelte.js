import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get($.get(foo), '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let foo = $.mutable_source(writable(0));

	$.store_unsub($.set(foo, writable(42)), '$foo', $$stores);
	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, $foo()));
	$.append($$anchor, text);
	$.pop();
	$$cleanup();
}