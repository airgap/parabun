import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<y class="svelte-xyz">this should be green</y>`);
var root = $.from_html(`<x class="svelte-xyz"></x> <!>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		const foo = ($$anchor) => {
			var y = root_1();

			$.append($$anchor, y);
		};

		Child(node, { foo, $$slots: { foo: true } });
	}

	$.append($$anchor, fragment);
}