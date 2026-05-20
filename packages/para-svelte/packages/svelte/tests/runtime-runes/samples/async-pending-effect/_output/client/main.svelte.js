import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root_3 = $.from_html(`<p>hello</p>`);
var root = $.from_html(`<button>toggle</button> <!> <!>`, 1);

export default function Main($$anchor) {
	let condition = $.state(false);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		const pending = ($$anchor) => {
			Component($$anchor, {});
		};

		$.boundary(node, { pending }, ($$anchor) => {
			{
				$.async($$anchor, void 0, [() => 1], ($$anchor, $0) => {
					Component($$anchor, {
						get whatever() {
							return $.get($0);
						}
					});
				});

				$.next();
			}
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_3();

			$.append($$anchor, p);
		};

		$.if(node_1, ($$render) => {
			if ($.get(condition)) $$render(consequent);
		});
	}

	$.delegated('click', button, () => $.set(condition, !$.get(condition)));
	$.append($$anchor, fragment);
}

$.delegate(['click']);