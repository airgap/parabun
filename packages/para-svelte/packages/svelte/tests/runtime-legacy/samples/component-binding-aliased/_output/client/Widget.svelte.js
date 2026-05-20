import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'bar', 12, 42);

	var $$exports = {
		get bar() {
			return foo();
		},

		set bar($$value) {
			foo($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}