import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const foo = ($$anchor) => {
	var y = root_1();

	$.append($$anchor, y);
};

var root_1 = $.from_html(`<y class="svelte-xyz"></y>`);
var root = $.from_html(`<x class="svelte-xyz">this should be green <!></x> <z><p class="svelte-xyz">this should be green</p> <!></z>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var x = $.first_child(fragment);
	var node = $.sibling($.child(x));

	foo(node);
	$.reset(x);

	var z = $.sibling(x, 2);
	var node_1 = $.sibling($.child(z), 2);

	foo(node_1);
	$.reset(z);
	$.append($$anchor, fragment);
}