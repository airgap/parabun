import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<b class="svelte-xyz">text</b>`);
var root = $.from_html(`<!> <h2 class="svelte-xyz"><!></h2>`, 1);

export default function Input($$anchor, $$props) {
	let element = $.prop($$props, 'element', 8, 'div');
	var fragment = root();
	var node = $.first_child(fragment);

	$.element(node, element, false, ($$element, $$anchor) => {
		$.set_class($$element, 0, 'svelte-xyz');
	});

	var h2 = $.sibling(node, 2);
	var node_1 = $.child(h2);

	$.element(node_1, element, false, ($$element_1, $$anchor) => {
		$.set_class($$element_1, 0, 'svelte-xyz');

		var b = root_1();

		$.append($$anchor, b);
	});

	$.reset(h2);
	$.append($$anchor, fragment);
}