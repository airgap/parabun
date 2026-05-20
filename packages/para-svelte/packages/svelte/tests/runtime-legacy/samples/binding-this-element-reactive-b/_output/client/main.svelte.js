import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<h1>hello</h1>`);
var root = $.from_html(`<div> </div> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, true);
	let h1 = $.mutable_source();

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var node = $.sibling(div, 2);

	{
		var consequent = ($$anchor) => {
			var h1_1 = root_1();

			$.bind_this(h1_1, ($$value) => $.set(h1, $$value), () => $.get(h1));
			$.append($$anchor, h1_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_text(text, `The text is ${(
		$.get(h1),
		$.untrack(() => $.get(h1) ? $.get(h1).textContent : 'missing')
	) ?? ''}`));

	$.append($$anchor, fragment);

	return $.pop($$exports);
}