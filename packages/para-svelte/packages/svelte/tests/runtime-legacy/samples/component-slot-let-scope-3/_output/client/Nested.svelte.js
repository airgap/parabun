import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!> <!> <!> <button>+1</button></div>`);

export default function Nested($$anchor, $$props) {
	let count = $.mutable_source(0);

	function increment() {
		$.set(count, $.get(count) + 1);
	}

	var div = root();
	var node = $.child(div);

	$.slot(
		node,
		$$props,
		'default',
		{
			get count() {
				return $.get(count);
			}
		},
		null
	);

	var node_1 = $.sibling(node, 2);

	$.slot(
		node_1,
		$$props,
		'foo',
		{
			get count() {
				return $.get(count);
			}
		},
		null
	);

	var node_2 = $.sibling(node_1, 2);

	$.slot(node_2, $$props, 'bar', {}, null);

	var button = $.sibling(node_2, 2);

	$.reset(div);
	$.event('click', button, increment);
	$.append($$anchor, div);
}