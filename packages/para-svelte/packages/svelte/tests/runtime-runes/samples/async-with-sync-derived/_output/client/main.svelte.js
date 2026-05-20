import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<button>log</button> <button> </button> <button> </button> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor) {
	let x = $.state(1);
	let y = $.derived(() => $.get(x));
	let other = $.state(1);
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
			var button_1 = $.sibling(button, 2);
			var text = $.child(button_1);

			$.reset(button_1);

			var button_2 = $.sibling(button_1, 2);
			var text_1 = $.child(button_2);

			$.reset(button_2);

			var p_1 = $.sibling(button_2, 2);
			var text_2 = $.child(p_1, true);

			$.reset(p_1);

			var p_2 = $.sibling(p_1, 2);
			var text_3 = $.child(p_2, true);

			$.reset(p_2);

			var p_3 = $.sibling(p_2, 2);
			var text_4 = $.child(p_3, true);

			$.reset(p_3);

			$.template_effect(
				($0) => {
					$.set_text(text, `x ${$.get(x) ?? ''}`);
					$.set_text(text_1, `other ${$.get(other) ?? ''}`);
					$.set_text(text_2, $.get(x));
					$.set_text(text_3, $0);
					$.set_text(text_4, $.get(y));
				},
				void 0,
				[() => $.get(x)]
			);

			$.delegated('click', button, () => console.log({ x: $.get(x), y: $.get(y) }));
			$.delegated('click', button_1, () => $.set(x, $.get(x) + 1));
			$.delegated('click', button_2, () => $.set(other, $.get(other) + 1));
			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
}

$.delegate(['click']);