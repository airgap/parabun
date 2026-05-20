import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { writable } from "svelte/store";

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $obj = () => $.store_get(obj, '$obj', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const obj = writable({ name: 'foo' });

	$.store_set(obj, { name: 'bar' });

	const clone = structuredClone($obj());
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, clone.name));
	$.append($$anchor, p);
	$.pop();
	$$cleanup();
}