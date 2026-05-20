import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Toggle foo</button> <button>Toggle bar</button> <hr/> <!> <hr/> <!>`, 1);

export default function Main($$anchor) {
	let foo = $.mutable_source(false);
	let bar = $.mutable_source([false]);
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 4);

	$.html(node, () => (
		$.get(foo),
		$.get(bar),
		$.untrack(() => `foo: ${$.get(foo)}, bar: ${$.get(bar).every((x) => x)}`)
	));

	var node_1 = $.sibling(node, 4);

	{
		var consequent = ($$anchor) => {
			var text = $.text('foo!');

			$.append($$anchor, text);
		};

		var consequent_1 = ($$anchor) => {
			var text_1 = $.text('bar!');

			$.append($$anchor, text_1);
		};

		var d = $.derived(() => ($.get(bar), $.untrack(() => $.get(bar).every((x) => x))));

		$.if(node_1, ($$render) => {
			if ($.get(foo)) $$render(consequent); else if ($.get(d)) $$render(consequent_1, 1);
		});
	}

	$.event('click', button, () => $.set(foo, !$.get(foo)));
	$.event('click', button_1, () => $.mutate(bar, $.get(bar)[0] = !$.get(bar)[0]));
	$.append($$anchor, fragment);
}