import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>+1</button> <!>`, 1);

export default function Nested($$anchor, $$props) {
	let count = $.mutable_source(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.slot(
		node,
		$$props,
		'default',
		{
			get c() {
				return $.get(count);
			}
		},
		null
	);

	$.event('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, fragment);
}