import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root = $.from_html(`<button>reset</button> <button>h1</button> <button>h2</button> <!>`, 1);

export default function Main($$anchor) {
	let deferred = $.state($.proxy(Promise.withResolvers()));
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [() => $.get(deferred).promise], (node_1, $$tag) => {
				$.element(node_1, () => $.get($$tag), false, ($$element, $$anchor) => {
					var text = $.text('hello');

					$.append($$anchor, text);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve('h1'));
	$.delegated('click', button_2, () => $.get(deferred).resolve('h2'));
	$.append($$anchor, fragment);
}

$.delegate(['click']);