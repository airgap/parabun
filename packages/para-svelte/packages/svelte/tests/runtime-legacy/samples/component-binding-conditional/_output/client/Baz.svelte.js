import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Baz($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, true);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}