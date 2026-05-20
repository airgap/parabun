import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { slide } from 'svelte/transition';

var root_2 = $.from_html(`<div>Should not transition out</div>`);
var root = $.from_html(`<button>Toggle</button> <!>`, 1);

export default function Main($$anchor) {
	let showText = $.state(false);
	let show = true;
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var div = root_2();

					$.transition(3, div, () => slide);
					$.append($$anchor, div);
				};

				$.if(node_1, ($$render) => {
					if (show) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(showText)) $$render(consequent_1);
		});
	}

	$.delegated('click', button, () => $.set(showText, !$.get(showText)));
	$.append($$anchor, fragment);
}

$.delegate(['click']);