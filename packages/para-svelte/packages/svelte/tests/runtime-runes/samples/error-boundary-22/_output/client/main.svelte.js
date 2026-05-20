import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root_1 = $.from_html(`<p>error occurred</p>`);
var root_2 = $.from_html(`<p>This should be removed</p> <!>`, 1);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const failed = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			var fragment_1 = root_2();
			var node_1 = $.sibling($.first_child(fragment_1), 2);

			{
				var consequent = ($$anchor) => {
					Child($$anchor, {});
				};

				$.if(node_1, ($$render) => {
					if (true) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
}