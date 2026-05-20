import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate } from 'svelte';
import Child from './Child.svelte';

var root = $.from_html(`<input/> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.mutable_source('rich');
	let allowed = $.mutable_source(false);

	beforeUpdate(() => {
		// if your name's not dan, you're not coming in
		$.set(allowed, $.get(name) === 'dan');
	});

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var node = $.sibling(input, 2);

	{
		var consequent = ($$anchor) => {
			Child($$anchor, {
				get name() {
					return $.get(name);
				}
			});
		};

		$.if(node, ($$render) => {
			if ($.get(allowed)) $$render(consequent);
		});
	}

	$.bind_value(input, () => $.get(name), ($$value) => $.set(name, $$value));
	$.append($$anchor, fragment);
	$.pop();
}