import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from "./Nested.svelte";

var root_1 = $.from_html(`<input slot="bar"/>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	Nested(node, {
		$$slots: {
			bar: ($$anchor, $$slotProps) => {
				var input = root_1();

				$.append($$anchor, input);
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Nested(node_1, {});
	$.append($$anchor, fragment);
}