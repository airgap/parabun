import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<button>reassign</button> <!>`, 1);

export default function Main($$anchor) {
	let value = $.mutable_source({ count: 1 });
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	Nested(node, {
		get primitive() {
			return ($.get(value), $.untrack(() => $.get(value).count));
		},

		get object() {
			return $.get(value);
		}
	});

	$.event('click', button, () => $.set(value, { count: 1 }));
	$.append($$anchor, fragment);
}