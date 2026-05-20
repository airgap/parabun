import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<h1> </h1>`);
var root = $.from_html(`<!> <h2> </h2> <h3> </h3>`, 1);

export default function Main($$anchor, $$props) {
	let browser = $.prop($$props, 'browser', 19, () => typeof window !== 'undefined');
	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [], [() => true], (node, $$condition) => {
		var consequent = ($$anchor) => {
			var h1 = root_1();
			var text = $.child(h1);

			$.reset(h1);
			$.template_effect(() => $.set_text(text, `hello from the ${browser() ? 'browser' : 'server'}`));
			$.append($$anchor, h1);
		};

		$.if(node, ($$render) => {
			if ($.get($$condition)) $$render(consequent);
		});
	});

	var h2 = $.sibling(node, 2);
	var text_1 = $.child(h2);

	$.reset(h2);

	var h3 = $.sibling(h2, 2);
	var text_2 = $.child(h3);

	$.reset(h3);

	$.template_effect(() => {
		$.set_text(text_1, `hello from the ${browser() ? 'browser' : 'server'}`);
		$.set_text(text_2, `hello from the ${browser() ? 'browser' : 'server'}`);
	});

	$.append($$anchor, fragment);
}