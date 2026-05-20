import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let clientHeight = $.prop($$props, 'clientHeight', 12);

	var $$exports = {
		get clientHeight() {
			return clientHeight();
		},

		set clientHeight($$value) {
			clientHeight($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get clientHeight() {
			return clientHeight();
		},

		set clientHeight($$value) {
			clientHeight($$value);
		},

		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text('Hello');

			$.append($$anchor, text);
		},
		$$slots: { default: true },
		$$legacy: true
	});

	return $.pop($$exports);
}