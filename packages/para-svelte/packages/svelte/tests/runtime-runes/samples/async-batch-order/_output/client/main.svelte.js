import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> <!></div> <button>a++</button> <button>shift</button> <button>middle</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	const deferred = [];

	function delay(value) {
		if (!value) return value;

		return new Promise((resolve) => deferred.push(() => resolve(value)));
	}

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);
	var node = $.sibling(text);

	{
		var consequent = ($$anchor) => {
			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => delay($.get(a))]);
			$.append($$anchor, text_1);
		};

		$.if(node, ($$render) => {
			if ($.get(a) < 2) $$render(consequent);
		});
	}

	$.reset(div);

	var button = $.sibling(div, 2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);

	$.template_effect(($0) => $.set_text(text, `${$.get(a) ?? ''} ${$0 ?? ''} `), void 0, [() => delay($.get(a))]);

	$.delegated('click', button, () => {
		$.update(a);
	});

	$.delegated('click', button_1, () => deferred.shift()?.());
	$.delegated('click', button_2, () => deferred[2]());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);