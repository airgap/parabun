import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<button>increment</button> <p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let data = $.state($.proxy(Promise.resolve(0)));
	let count = $.state(0);
	let unrelated = $.state(0);

	$.user_effect(() => {
		$.set(data, Promise.resolve($.get(count)), true);
		$.set(unrelated, $.get(count), true);
	});

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var button = $.first_child(fragment_1);
			var p_1 = $.sibling(button, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var node_1 = $.sibling(p_1, 2);

			{
				var consequent = ($$anchor) => {
					var p_2 = root_3();
					var text_1 = $.child(p_2, true);

					$.reset(p_2);
					$.template_effect(() => $.set_text(text_1, $.get(unrelated)));
					$.append($$anchor, p_2);
				};

				$.if(node_1, ($$render) => {
					if (true) $$render(consequent);
				});
			}

			$.template_effect(($0) => $.set_text(text, $0), void 0, [
				async () => JSON.stringify((await $.save($.get(data)))(), null, 2)
			]);

			$.delegated('click', button, () => $.set(count, $.get(count) + 1));
			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);