import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root_1 = $.from_svg(`<line x1="0" y1="0" x2="100" y2="100"></line>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor) {
	var div = root();
	var node = $.child(div);

	Widget(node, {
		children: ($$anchor, $$slotProps) => {
			var line = root_1();

			$.append($$anchor, line);
		},
		$$slots: { default: true }
	});

	$.reset(div);
	$.append($$anchor, div);
}