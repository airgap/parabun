import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Svg from './svg.svelte';

var root_1 = $.from_svg(`<a><text>Hello</text></a>`);
var root_2 = $.from_svg(`<a><text>Hello</text></a>`);
var root = $.from_svg(`<svg><a><text>Hello</text></a></svg><svg><!></svg><!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var svg = $.sibling($.first_child(fragment));

	{
		const test = ($$anchor) => {
			var a = root_1();

			$.append($$anchor, a);
		};

		var node = $.child(svg);

		test(node);
		$.reset(svg);
	}

	var node_1 = $.sibling(svg);

	Svg(node_1, {
		children: ($$anchor, $$slotProps) => {
			var a_1 = root_2();

			$.append($$anchor, a_1);
		},
		$$slots: { default: true }
	});

	$.append($$anchor, fragment);
}