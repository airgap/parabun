import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>a</button> <button>b</button> <button>resolve</button> <!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let a_b = $.derived(() => $.get(a) * $.get(b));
	const queued = [];

	function push(value) {
		if (!value) return value;

		return new Promise((resolve) => {
			queued.push(() => resolve(value));
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		var consequent = ($$anchor) => {
			var text = $.text('hi');

			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if ($.get(a_b)) $$render(consequent);
		});
	}

	var text_1 = $.sibling(node);

	$.template_effect(($0) => $.set_text(text_1, ` ${$0 ?? ''}`), void 0, [() => push($.get(a_b))]);
	$.delegated('click', button, () => $.update(a));
	$.delegated('click', button_1, () => $.update(b));
	$.delegated('click', button_2, () => queued.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);