import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let item = $.prop($$props, 'item', 12);

	console.log(item());
	item(1);

	var $$exports = {
		get item() {
			return item();
		},

		set item($$value) {
			item($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}