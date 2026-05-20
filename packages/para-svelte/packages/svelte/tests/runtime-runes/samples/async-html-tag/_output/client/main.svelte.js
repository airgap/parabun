import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<h1><!></h1>`);
var root = $.from_html(`<button>reset</button> <button>hello</button> <button>goodbye</button> <!>`, 1);

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
			var h1 = root_2();
			var node_1 = $.child(h1);

			$.async(node_1, [], [() => $.get(deferred).promise], (node_1, $$html) => {
				$.html(node_1, () => $.get($$html));
			});

			$.reset(h1);
			$.append($$anchor, h1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve('hello'));
	$.delegated('click', button_2, () => $.get(deferred).resolve('goodbye'));
	$.append($$anchor, fragment);
}

$.delegate(['click']);