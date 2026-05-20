import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Tab($$anchor, $$props) {
	$.push($$props, false);

	let tab = $.prop($$props, 'tab', 12);

	var $$exports = {
		get tab() {
			return tab();
		},

		set tab($$value) {
			tab($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}