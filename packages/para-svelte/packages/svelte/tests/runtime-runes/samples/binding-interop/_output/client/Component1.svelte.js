import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root_2 = $.from_html(`<button> </button>`);

export default function Component1($$anchor, $$props) {
	$.push($$props, true);

	let object = $.prop($$props, 'object', 15),
		primitive = $.prop($$props, 'primitive', 15);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var button = root_1();
			var text = $.child(button, true);

			$.reset(button);
			$.template_effect(() => $.set_text(text, primitive()));
			$.delegated('click', button, () => primitive('bar'));
			$.append($$anchor, button);
		};

		var alternate = ($$anchor) => {
			var button_1 = root_2();
			var text_1 = $.child(button_1, true);

			$.reset(button_1);
			$.template_effect(() => $.set_text(text_1, object().value));
			$.delegated('click', button_1, () => object(object().value = 'bar', true));
			$.append($$anchor, button_1);
		};

		$.if(node, ($$render) => {
			if (primitive()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);