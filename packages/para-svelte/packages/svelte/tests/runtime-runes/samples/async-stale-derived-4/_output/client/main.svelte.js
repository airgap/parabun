import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>increment</button> <button>hide</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let show = $.state(true);
	let count = $.state(0);
	const queue = [];

	function push(value) {
		if (!value) return value;

		return new Promise((r) => queue.push(() => r(value)));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var text = $.sibling(button_2);
	var node = $.sibling(text);

	{
		var consequent = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(count))]);
			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if ($.get(show)) $$render(consequent);
		});
	}

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''} `), void 0, [() => push($.get(count))]);
	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => $.set(show, false));
	$.delegated('click', button_2, () => queue.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);