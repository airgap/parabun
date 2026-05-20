import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<p>disabled</p>`);
var root_3 = $.from_html(`<p>enabled</p>`);
var root_1 = $.from_html(`<!> <p>unconditional</p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let enabled = $.prop($$props, 'enabled', 12);

	var $$exports = {
		get enabled() {
			return enabled();
		},

		set enabled($$value) {
			enabled($$value);
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

				var alternate = ($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				};

				$.if(node, ($$render) => {
					if (!enabled()) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.next(2);
			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}