import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const foo = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p class="svelte-xyz">this should be green</p>`);
var root = $.from_html(`<h1 class="svelte-xyz">Hello</h1> <!>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	foo(node);
	$.append($$anchor, fragment);
}