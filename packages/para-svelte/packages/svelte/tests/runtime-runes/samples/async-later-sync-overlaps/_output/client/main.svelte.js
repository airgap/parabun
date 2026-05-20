import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button> <button>resolve</button> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let deferreds = [];

	function push(value) {
		if (!value) return value;

		return new Promise((resolve) => {
			deferreds.push(() => resolve(value));
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	var button_2 = $.sibling(button_1, 2);
	var text_2 = $.sibling(button_2);

	$.template_effect(
		($0) => {
			$.set_text(text, `a_b ${$.get(a) ?? ''}_${$.get(b) ?? ''}`);
			$.set_text(text_1, `b ${$.get(b) ?? ''}`);
			$.set_text(text_2, ` ${$0 ?? ''}`);
		},
		void 0,
		[() => push($.get(a))]
	);

	$.delegated('click', button, () => {
		$.update(a);
		$.update(b);
	});

	$.delegated('click', button_1, () => $.update(b));
	$.delegated('click', button_2, () => deferreds.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);