import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';
import B from './B.svelte';

var root = $.from_html(`<!> <!> <!> <!> <!> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, void 0, [() => 1], ($$anchor, $0) => {
		A(node, {
			name: 'a-1',
			get content() {
				return $.get($0);
			}
		});
	});

	var node_1 = $.sibling(node, 2);

	$.async(node_1, void 0, [() => 2], ($$anchor, $0) => {
		A(node_1, {
			name: 'a-2',
			get content() {
				return $.get($0);
			}
		});
	});

	var node_2 = $.sibling(node_1, 2);

	B(node_2, { name: 'b-1', content: 1 });

	var node_3 = $.sibling(node_2, 2);

	$.async(node_3, void 0, [() => 3], ($$anchor, $0) => {
		A(node_3, {
			name: 'a-3',
			get content() {
				return $.get($0);
			}
		});
	});

	var node_4 = $.sibling(node_3, 2);

	B(node_4, { name: 'b-2', content: 2 });

	var node_5 = $.sibling(node_4, 2);

	B(node_5, { name: 'b-3', content: 3 });
	$.append($$anchor, fragment);
}