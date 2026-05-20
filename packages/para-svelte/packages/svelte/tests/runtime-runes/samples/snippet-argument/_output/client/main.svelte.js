import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const foo = ($$anchor, n = $.noop) => {
	var p = root_1();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `clicks: ${n() ?? ''}`));
	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<!> <button>click me</button>`, 1);

export default function Main($$anchor) {
	let count = $.state(0);
	var fragment = root();
	var node = $.first_child(fragment);

	foo(node, () => $.get(count));

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, fragment);
}