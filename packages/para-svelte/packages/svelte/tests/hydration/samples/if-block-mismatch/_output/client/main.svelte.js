import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>foo</p>`);
var root_2 = $.from_html(`<p>bar</p>`);

export default function Main($$anchor, $$props) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if ($$props.condition) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);
}