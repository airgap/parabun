import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Item from './Item.svelte';

export default function List($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => [3, 2, 1]);

	function update() {
		items([1, 2, 3, 4, 5]);
	}

	var $$exports = {
		update,
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item) => {
		Item($$anchor, {
			get item() {
				return $.get(item);
			}
		});
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}