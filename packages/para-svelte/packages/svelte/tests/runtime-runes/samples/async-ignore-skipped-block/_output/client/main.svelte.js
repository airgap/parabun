import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>hello</p>`);
var root = $.from_html(`<button> </button> <button> </button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let a = $.state(0);
	let b = $.state(0);
	let show = $.state(true);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1);

	$.reset(button_1);

	var node = $.sibling(button_1, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var text_2 = $.text();

			$.template_effect(($0) => $.set_text(text_2, $0), void 0, [() => new Promise(() => {})]);
			$.append($$anchor, text_2);
		};

		$.if(node, ($$render) => {
			if ($.get(show)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.template_effect(() => {
		$.set_text(text, `a ${$.get(a) ?? ''}`);
		$.set_text(text_1, `b ${$.get(b) ?? ''}`);
	});

	$.delegated('click', button, () => ($.update(a), $.set(show, !$.get(show))));
	$.delegated('click', button_1, () => ($.update(b), $.set(show, !$.get(show))));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);