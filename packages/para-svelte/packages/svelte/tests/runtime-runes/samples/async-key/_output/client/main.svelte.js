import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<h1>hello</h1>`);
var root = $.from_html(`<button>reset</button> <button>1</button> <button>2</button> <!>`, 1);

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

			$.async(node_1, [], [() => $.get(deferred).promise], (node_1, $$key) => {
				$.key(node_1, () => $.get($$key), ($$anchor) => {
					var h1 = root_3();

					$.append($$anchor, h1);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve(1));
	$.delegated('click', button_2, () => $.get(deferred).resolve(2));
	$.append($$anchor, fragment);
}

$.delegate(['click']);