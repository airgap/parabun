import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<p> </p> <p> </p>`, 1);
var root = $.from_html(`<button>both</button> <button>a</button> <button>b</button> <!>`, 1);

export default function Main($$anchor) {
	let a = $.state(1);
	let b = $.state(2);
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
			var p_1 = $.first_child(fragment_1);
			var text = $.child(p_1);

			$.reset(p_1);

			var p_2 = $.sibling(p_1, 2);
			var text_1 = $.child(p_2);

			$.reset(p_2);

			$.template_effect(
				($0) => {
					$.set_text(text, `${$.get(a) ?? ''} * 2 = ${$0 ?? ''}`);
					$.set_text(text_1, `${$.get(b) ?? ''} * 2 = ${$.get(b) * 2}`);
				},
				void 0,
				[() => $.get(a) * 2]
			);

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		$.set(a, $.get(a) + 1);
		$.set(b, $.get(b) + 1);
	});

	$.delegated('click', button_1, () => {
		$.set(a, $.get(a) + 1);
	});

	$.delegated('click', button_2, () => {
		$.set(b, $.get(b) + 1);
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);