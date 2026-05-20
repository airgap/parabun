import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<p>updating...</p>`);
var root_2 = $.from_html(`<h1> </h1> <!>`, 1);
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
			var fragment_1 = root_2();
			var h1 = $.first_child(fragment_1);
			var text = $.child(h1, true);

			$.reset(h1);

			var node_1 = $.sibling(h1, 2);

			{
				var consequent = ($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if ($.eager($.pending)) $$render(consequent);
				});
			}

			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => $.get(deferred).promise]);
			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve('hello'));
	$.delegated('click', button_2, () => $.get(deferred).resolve('goodbye'));
	$.append($$anchor, fragment);
}

$.delegate(['click']);