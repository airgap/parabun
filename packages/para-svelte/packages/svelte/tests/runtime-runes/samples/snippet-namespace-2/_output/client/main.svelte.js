import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>hello</p>`);
var root = $.from_svg(`<svg><foreignObject><!></foreignObject></svg>`);

export default function Main($$anchor) {
	var svg = root();

	{
		const p = ($$anchor) => {
			var p_1 = root_1();

			$.append($$anchor, p_1);
		};

		var foreignObject = $.child(svg);
		var node = $.child(foreignObject);

		p(node);
		$.reset(foreignObject);
		$.reset(svg);
	}

	$.append($$anchor, svg);
}