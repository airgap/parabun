import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_svg(`<a href="/docs"><text x="20" y="40" class="small"></text></a>`);
var root = $.from_svg(`<svg><!></svg>`);

export default function Main($$anchor) {
	var svg = root();
	var node = $.child(svg);

	{
		var consequent = ($$anchor) => {
			var a = root_1();
			var text = $.child(a);

			text.textContent = name;
			$.reset(a);
			$.append($$anchor, a);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.reset(svg);
	$.append($$anchor, svg);
}