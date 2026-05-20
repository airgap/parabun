import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $foo = () => $.store_get(foo, '$foo', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const foo = writable('div');

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, $foo, false);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}