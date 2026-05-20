import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<p>cool</p> <!> <p>awesome</p> <!> <p>neato</p> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var p = $.first_child(fragment);

	$.attribute_effect(p, ($0) => ({ ...$0 }), void 0, [() => ({ class: 'cool' })]);

	var node = $.sibling(p, 2);

	$.async(node, void 0, [() => ({ thing: 'beans' })], ($$anchor, $0) => {
		Child(node, $.spread_props(() => $.get($0)));
	});

	var p_1 = $.sibling(node, 2);
	var node_1 = $.sibling(p_1, 2);

	$.async(node_1, void 0, [() => 'sauce'], ($$anchor, $0) => {
		Child(node_1, {
			get thing() {
				return $.get($0);
			}
		});
	});

	var p_2 = $.sibling(node_1, 2);

	$.attribute_effect(p_2, ($0) => ({ ...{}, class: $0 }), void 0, [() => 'neato']);

	var node_2 = $.sibling(p_2, 2);

	$.async(node_2, void 0, [() => 'burrito'], ($$anchor, $0) => {
		Child(node_2, $.spread_props({}, {
			get thing() {
				return $.get($0);
			}
		}));
	});

	$.template_effect(($0) => $.set_class(p_1, 1, $0), void 0, [async () => $.clsx(await 'awesome')]);
	$.append($$anchor, fragment);
}