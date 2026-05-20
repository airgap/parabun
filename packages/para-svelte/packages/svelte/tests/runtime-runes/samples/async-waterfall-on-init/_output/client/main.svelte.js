import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<button> </button> <p> </p>`, 1);
var root = $.from_html(`<button>resolve 1</button> <button>resolve 2</button> <hr/> <!>`, 1);

export default function Main($$anchor) {
	let d1 = Promise.withResolvers();
	let d2 = Promise.withResolvers();
	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 4);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [() => d1.promise], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var fragment_2 = root_3();
					var button_2 = $.first_child(fragment_2);
					var text = $.child(button_2, true);

					$.reset(button_2);

					var p_1 = $.sibling(button_2, 2);
					var text_1 = $.child(p_1, true);

					$.reset(p_1);

					$.template_effect(
						($0) => {
							$.set_text(text, $.get(count));
							$.set_text(text_1, $0);
						},
						void 0,
						[() => d2.promise]
					);

					$.delegated('click', button_2, () => $.set(count, $.get(count) + 1));
					$.append($$anchor, fragment_2);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => d1.resolve(true));
	$.delegated('click', button_1, () => d2.resolve(true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);