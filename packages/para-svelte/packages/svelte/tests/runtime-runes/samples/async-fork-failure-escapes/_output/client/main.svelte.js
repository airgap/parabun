import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fork } from 'svelte';

var root = $.from_html(`<button>show</button> <button>commit</button> <button>discard</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let show = $.state(false);
	let f;
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const failed = ($$anchor) => {
			$.next();

			var text = $.text('failed');

			$.append($$anchor, text);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var text_1 = $.text();

					$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => Promise.reject('boom')]);
					$.append($$anchor, text_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get(show)) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => f = fork(() => $.set(show, true)));
	$.delegated('click', button_1, () => f.commit());
	$.delegated('click', button_2, () => f.discard());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);