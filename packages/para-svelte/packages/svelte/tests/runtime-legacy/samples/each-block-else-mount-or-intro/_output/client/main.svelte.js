import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);

	var $$exports = {
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

	$.each(
		node,
		1,
		items,
		$.index,
		($$anchor, item) => {
			Widget($$anchor, {
				get item() {
					return $.get(item);
				}
			});
		},
		($$anchor) => {
			$.next();

			var text = $.text('No items.');

			$.append($$anchor, text);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}