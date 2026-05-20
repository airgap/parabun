import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable, derived } from 'svelte/store';

var root = $.from_html(`<p style="position: fixed; top: 1em; left: 1em;"> </p> <div style="height: 9999px"></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $y = () => $.store_get(y, '$y', $$stores);
	const $y_squared = () => $.store_get(y_squared, '$y_squared', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const y = writable(0);
	const y_squared = derived(y, ($y) => $y * $y);

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);
	$.next(2);
	$.template_effect(() => $.set_text(text, `scroll y is ${$y() ?? ''}. ${$y() ?? ''} * ${$y() ?? ''} = ${$y_squared() ?? ''}`));
	$.bind_window_scroll('y', $y, ($$value) => $.store_set(y, $$value));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}