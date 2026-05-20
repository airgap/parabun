import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>cond</p>`);
var root = $.from_html(`<p>start</p><!>`, 1);

export default function Main($$anchor) {
	const cond = true;
	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if (cond) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
}