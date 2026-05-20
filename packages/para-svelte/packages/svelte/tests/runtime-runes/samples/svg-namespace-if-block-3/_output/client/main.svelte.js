import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_svg(`<title>potato</title>`);
var root = $.from_svg(`<svg><!></svg>`);

export default function Main($$anchor) {
	var svg = root();
	var node = $.child(svg);

	{
		var consequent = ($$anchor) => {
			var title = root_1();

			$.append($$anchor, title);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.reset(svg);
	$.append($$anchor, svg);
}