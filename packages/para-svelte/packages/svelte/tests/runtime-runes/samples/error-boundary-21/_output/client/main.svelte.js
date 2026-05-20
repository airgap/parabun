import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<button></button> <!>`, 1);

export default function Main($$anchor) {
	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		const failed = ($$anchor) => {
			var div = root_1();
			var text = $.child(div, true);

			$.reset(div);
			$.template_effect(() => $.set_text(text, $.get(count)));
			$.append($$anchor, div);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			Child($$anchor, {});
		});
	}

	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, fragment);
}

$.delegate(['click']);