import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<div style="width: 100%; height: 9999px;"></div> <button>toggle</button> <!>`, 1);

export default function Main($$anchor) {
	let show = $.mutable_source(false);
	var fragment = root();
	var button = $.sibling($.first_child(fragment), 2);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			Child($$anchor, {});
		};

		$.if(node, ($$render) => {
			if ($.get(show)) $$render(consequent);
		});
	}

	$.event('click', button, () => $.set(show, !$.get(show)));
	$.append($$anchor, fragment);
}