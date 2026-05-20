import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

var root_1 = $.from_html(`One <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, true);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	Outer($$anchor, {
		get foo() {
			return foo();
		},

		children: ($$anchor, $$slotProps) => {
			$.next();

			var fragment_1 = root_1();
			var node = $.sibling($.first_child(fragment_1));

			Inner(node, {});
			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}