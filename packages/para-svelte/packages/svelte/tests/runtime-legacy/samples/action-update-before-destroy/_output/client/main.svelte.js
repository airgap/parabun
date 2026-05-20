import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Component from "./Component.svelte";

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $items = () => $.store_get(items, '$items', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let items = writable({ 1: { id: 1 } });

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($items(), $.untrack(() => Object.values($items()))), (item) => item.id, ($$anchor, item) => {
		Component($$anchor, {
			get id() {
				return ($.get(item), $.untrack(() => $.get(item).id));
			},

			get items() {
				return items;
			}
		});
	});

	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}