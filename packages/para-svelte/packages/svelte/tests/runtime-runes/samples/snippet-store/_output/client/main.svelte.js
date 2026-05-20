import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

const hello = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p>hello world</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $snippet = () => $.store_get(snippet, '$snippet', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let snippet = writable(hello);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.snippet(node, $snippet);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}