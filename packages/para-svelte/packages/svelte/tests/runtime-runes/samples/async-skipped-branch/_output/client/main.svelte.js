import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_3 = $.from_html(`<button> </button>`);
var root = $.from_html(`<button>show</button> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let show = $.state(false);
	let show_async = $.state(false);
	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var text = $.text('hi');

			$.append($$anchor, text);
		};

		var alternate = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent_1 = ($$anchor) => {
					var button_1 = root_3();
					var text_1 = $.child(button_1, true);

					$.reset(button_1);
					$.template_effect(() => $.set_text(text_1, $.get(count)));
					$.delegated('click', button_1, () => $.update(count));
					$.append($$anchor, button_1);
				};

				$.if(node_1, ($$render) => {
					if ($.get(show) || !$.get(show)) $$render(consequent_1);
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($.get(show)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	var node_2 = $.sibling(node, 2);

	{
		var consequent_2 = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(($0) => $.set_text(text_2, $0), void 0, [() => new Promise(() => {})]);
			$.append($$anchor, text_2);
		};

		$.if(node_2, ($$render) => {
			if ($.get(show_async)) $$render(consequent_2);
		});
	}

	$.delegated('click', button, () => {
		$.set(show, true);
		$.set(show_async, true);
	});

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);