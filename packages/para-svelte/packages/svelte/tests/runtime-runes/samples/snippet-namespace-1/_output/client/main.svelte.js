import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root_1 = $.from_svg(`<line x1="0" y1="0" x2="100" y2="100"></line>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor) {
	var div = root();
	var node = $.child(div);

	{
		const children = ($$anchor) => {
			var line = root_1();

			$.append($$anchor, line);
		};

		Widget(node, { children, $$slots: { default: true } });
	}

	$.reset(div);
	$.append($$anchor, div);
}