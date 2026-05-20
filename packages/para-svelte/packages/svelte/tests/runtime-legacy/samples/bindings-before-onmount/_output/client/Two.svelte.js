import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Two($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12, 1);

	function foo() {
		return bar() * 2;
	}

	var $$exports = {
		foo,
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.bind_prop($$props, 'foo', foo);

	return $.pop($$exports);
}