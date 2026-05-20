import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const foo = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

const bar = ($$anchor) => {
	var p_1 = root_2();

	$.append($$anchor, p_1);
};

var root_1 = $.from_html(`<p>foo</p>`);
var root_2 = $.from_html(`<p>bar</p>`);
var root = $.from_html(`<!> <button>show bar</button>`, 1);

export default function Main($$anchor) {
	let show_foo = $.state(true);
	let snippet = $.derived(() => $.get(show_foo) ? foo : bar);
	var fragment = root();
	var node = $.first_child(fragment);

	$.snippet(node, () => $.get(snippet));

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(show_foo, false));
	$.append($$anchor, fragment);
}