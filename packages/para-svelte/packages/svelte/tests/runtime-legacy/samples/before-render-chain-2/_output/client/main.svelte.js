import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Item from './Item.svelte';

export default function Main($$anchor) {
	var items = Array(1000);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => items, $.index, ($$anchor, item) => {
		Item($$anchor, {});
	});

	$.append($$anchor, fragment);
}