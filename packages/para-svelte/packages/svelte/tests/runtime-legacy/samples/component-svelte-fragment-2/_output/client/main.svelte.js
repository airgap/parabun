import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<span>Hello</span>`);
var root_4 = $.from_html(`<span>world</span>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	Nested(node, {
		$$slots: {
			name: ($$anchor, $$slotProps) => {
				var span = root_2();

				$.append($$anchor, span);
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Nested(node_1, {
		$$slots: {
			name: ($$anchor, $$slotProps) => {
				var span_1 = root_4();

				$.append($$anchor, span_1);
			}
		}
	});

	$.append($$anchor, fragment);
}