import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const thing = ($$anchor) => {
	var p = root_1();

	$.append($$anchor, p);
};

var root_1 = $.from_html(`<p>thing</p>`);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			thing($$anchor);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 0, () => [1, 2, 3], $.index, ($$anchor, n) => {
		thing($$anchor);
	});

	$.append($$anchor, fragment);
}