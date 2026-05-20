import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root = $.from_html(`<button>reset</button> <button>one</button> <button>two</button> <button>reject</button> <!>`, 1);

export default function Main($$anchor) {
	let deferred = $.state($.proxy(Promise.withResolvers()));
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var node = $.sibling(button_3, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.await(
				node_1,
				async () => (await $.save($.get(deferred).promise))() + "_res",
				($$anchor) => {
					var text_2 = $.text('waiting');

					$.append($$anchor, text_2);
				},
				($$anchor, res) => {
					var text = $.text();

					$.template_effect(() => $.set_text(text, $.get(res)));
					$.append($$anchor, text);
				},
				($$anchor, err) => {
					var text_1 = $.text();

					$.template_effect(() => $.set_text(text_1, `${$.get(err) ?? ''}_catch`));
					$.append($$anchor, text_1);
				}
			);

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve("one"));
	$.delegated('click', button_2, () => $.get(deferred).resolve("two"));
	$.delegated('click', button_3, () => $.get(deferred).reject("reject"));
	$.append($$anchor, fragment);
}

$.delegate(['click']);