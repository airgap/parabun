import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, () => ({}));
	let bar = 'baz';

	foo(foo()[bar] = 1, true);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}