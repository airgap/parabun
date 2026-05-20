import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $store1 = () => $.store_get($.get(store1), '$store1', $$stores);
	const $store2 = () => $.store_get($.get(store2), '$store2', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const context = { store1: writable(31), store2: writable(42) };
	let store1 = $.mutable_source();
	let store2 = $.mutable_source();

	(
		$.store_unsub($.set(store1, context.store1), '$store1', $$stores),
		$.store_unsub($.set(store2, context.store2), '$store2', $$stores)
	);

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${$store1() ?? ''}
${$store2() ?? ''}`));

	$.append($$anchor, text);
	$.pop();
	$$cleanup();
}