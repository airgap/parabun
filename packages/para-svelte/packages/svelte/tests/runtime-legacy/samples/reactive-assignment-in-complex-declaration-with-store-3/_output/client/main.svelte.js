import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { store } from './store';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor) {
	const $store = () => $.store_get(store, '$store', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	var h1 = root();
	var text = $.child(h1, true);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, $store()));
	$.append($$anchor, h1);
	$$cleanup();
}