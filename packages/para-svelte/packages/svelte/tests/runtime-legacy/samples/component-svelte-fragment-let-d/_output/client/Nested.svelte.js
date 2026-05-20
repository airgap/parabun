import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!></div>`);

export default function Nested($$anchor, $$props) {
	let foo = $.mutable_source('a');
	var div = root();
	var node = $.child(div);

	$.slot(
		node,
		$$props,
		'main',
		{
			get foo() {
				return $.get(foo);
			}
		},
		null
	);

	$.reset(div);
	$.event('click', div, () => $.set(foo, 'b'));
	$.append($$anchor, div);
}