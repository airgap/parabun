import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<p id="test"> </p>`);
var root = $.from_html(`<button>a++</button> <button>b++</button> <button>shift</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let deferreds = [];
	let a = $.state(1);
	let b = $.state(2);

	async function push(a, b) {
		var d = Promise.withResolvers();

		deferreds.push(d);
		await d.promise;

		return a + b;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var node = $.sibling(button_3, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_1 = root_2();
			var text = $.child(p_1);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, `${$.get(a) ?? ''} + ${$.get(b) ?? ''} = ${$0 ?? ''}`), void 0, [() => push($.get(a), $.get(b))]);
			$.append($$anchor, p_1);
		});
	}

	$.delegated('click', button, () => $.update(a));
	$.delegated('click', button_1, () => $.update(b));
	$.delegated('click', button_2, () => deferreds.shift()?.resolve());
	$.delegated('click', button_3, () => deferreds.pop()?.resolve());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);