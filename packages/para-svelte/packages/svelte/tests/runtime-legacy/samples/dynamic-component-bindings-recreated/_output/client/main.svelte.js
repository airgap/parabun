import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Green from './Green.svelte';
import Red from './Red.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => x() ? Green : Red, ($$anchor, $$component) => {
		$$component($$anchor, {
			get foo() {
				return foo();
			},

			set foo($$value) {
				foo($$value);
			},
			$$legacy: true
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}