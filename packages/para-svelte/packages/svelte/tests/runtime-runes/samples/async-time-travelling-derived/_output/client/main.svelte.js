import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<h1>a</h1>`);
var root_3 = $.from_html(`<h1>b</h1>`);
var root_1 = $.from_html(`<button>a</button> <button>b</button> <button> </button> <!>`, 1);

export default function Main($$anchor) {
	let object = $.state(null);
	let count = $.state(0);
	const condition = $.derived(() => $.get(object) === null);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_1();
			var button = $.first_child(fragment_1);
			var button_1 = $.sibling(button, 2);
			var button_2 = $.sibling(button_1, 2);
			var text = $.child(button_2, true);

			$.reset(button_2);

			var node_1 = $.sibling(button_2, 2);

			{
				var consequent = ($$anchor) => {
					var h1 = root_2();

					$.append($$anchor, h1);
				};

				var alternate = ($$anchor) => {
					var h1_1 = root_3();

					$.append($$anchor, h1_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get(condition)) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => $.get(count)]);
			$.delegated('click', button, () => $.set(object, null));
			$.delegated('click', button_1, () => $.set(object, {}, true));

			$.delegated('click', button_2, async () => {
				$.update(count);
				await Promise.resolve();
				$.set(object, {}, true);
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
}

$.delegate(['click']);