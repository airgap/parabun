import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.head('n5114s', ($$anchor) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		$.html(node, foo);
		$.append($$anchor, fragment);
	});

	return $.pop($$exports);
}