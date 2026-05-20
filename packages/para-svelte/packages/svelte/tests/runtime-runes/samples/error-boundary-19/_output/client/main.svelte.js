import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div> <button>Increment</button> `, 1);
var root_2 = $.from_html(`<div> </div> <button>Increment</button> `, 1);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);

	let test = $.derived(() => {
		if ($.get(count) > 1) {
			throw new Error('test');
		}
	});

	var fragment = root();
	var node = $.first_child(fragment);

	$.boundary(
		node,
		{
			onerror: (e) => {
				console.log('error caught 1');
			}
		},
		($$anchor) => {
			var fragment_1 = root_1();
			var div = $.first_child(fragment_1);
			var text = $.child(div);

			$.reset(div);

			var button = $.sibling(div, 2);
			var text_1 = $.sibling(button);

			$.template_effect(() => {
				$.set_text(text, `Count: ${$.get(count) ?? ''}`);
				$.set_text(text_1, ` ${$.get(count) ?? ''} / ${$.get(test) ?? ''}`);
			});

			$.delegated('click', button, () => $.update(count));
			$.append($$anchor, fragment_1);
		}
	);

	var node_1 = $.sibling(node, 2);

	$.boundary(
		node_1,
		{
			onerror: (e) => {
				console.log('error caught 2');
			}
		},
		($$anchor) => {
			var fragment_2 = root_2();
			var div_1 = $.first_child(fragment_2);
			var text_2 = $.child(div_1);

			$.reset(div_1);

			var button_1 = $.sibling(div_1, 2);
			var text_3 = $.sibling(button_1);

			$.template_effect(() => {
				$.set_text(text_2, `Count: ${$.get(count) ?? ''}`);
				$.set_text(text_3, ` ${$.get(count) ?? ''} / ${$.get(test) ?? ''}`);
			});

			$.delegated('click', button_1, () => $.update(count));
			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);