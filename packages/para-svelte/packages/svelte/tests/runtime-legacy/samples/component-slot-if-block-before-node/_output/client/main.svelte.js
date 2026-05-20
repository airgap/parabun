import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<p>conditional</p>`);
var root_1 = $.from_html(`<!> <p>unconditional</p>`, 1);

export default function Main($$anchor, $$props) {
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

	Nested($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = root_1();
			var node = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var p = root_2();

					$.append($$anchor, p);
				};

				$.if(node, ($$render) => {
					if (foo()) $$render(consequent);
				});
			}

			$.next(2);
			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}