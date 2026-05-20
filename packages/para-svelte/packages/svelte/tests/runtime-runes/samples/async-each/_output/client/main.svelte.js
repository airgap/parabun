import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>reset</button> <button>abc</button> <button>defg</button> <!>`, 1);

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

			$.async(node_1, [], [() => $.get(deferred).promise], (node_1, $$collection) => {
				$.each(node_1, 17, () => $.get($$collection), $.index, ($$anchor, item) => {
					var p_1 = root_3();
					var text = $.child(p_1, true);

					$.reset(p_1);
					$.template_effect(() => $.set_text(text, $.get(item)));
					$.append($$anchor, p_1);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve(['a', 'b', 'c']));
	$.delegated('click', button_2, () => $.get(deferred).resolve(['d', 'e', 'f', 'g']));
	$.append($$anchor, fragment);
}

$.delegate(['click']);