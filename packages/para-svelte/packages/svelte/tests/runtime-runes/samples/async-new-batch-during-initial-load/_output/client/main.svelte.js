import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>increment</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let other = $.state(0);
	const queue = [];

	function push(v) {
		return new Promise((r, e) => queue.push(() => v === 1 ? e(v) : r(v)));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				const failed = ($$anchor) => {
					$.next();

					var text = $.text('boom');

					$.append($$anchor, text);
				};

				$.boundary(node_1, { failed }, ($$anchor) => {
					$.next();

					var text_1 = $.text();

					$.template_effect(($0) => $.set_text(text_1, `${$0 ?? ''} ${$.get(count) ?? ''} ${$.get(other) ?? ''}`), void 0, [() => push($.get(count))]);
					$.append($$anchor, text_1);
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(count) > 0) $$render(consequent);
		});
	}

	$.delegated('click', button, () => {
		if ($.get(count) === 0) {
			$.update(other);
			$.update(count);
		} else {
			$.update(count);
		}
	});

	$.delegated('click', button_1, () => queue.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);