import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p>pending</p>`);
var root = $.from_html(`<button> </button> <!>`, 1);

export default function Main($$anchor) {
	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var node = $.sibling(button, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			Child($$anchor, {
				get count() {
					return $.get(count);
				}
			});
		});
	}

	$.template_effect(() => $.set_text(text, $.get(count)));
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.append($$anchor, fragment);
}

$.delegate(['click']);