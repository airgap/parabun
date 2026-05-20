import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Div from './div.svelte';

var root_1 = $.from_html(`<a><span>Hello</span></a>`);
var root_2 = $.from_html(`<a><span>Hello</span></a>`);
var root = $.from_html(`<div><a><span>Hello</span></a></div> <div><!></div> <!>`, 1);

export default function Main($$anchor) {
	var fragment = root();
	var div = $.sibling($.first_child(fragment), 2);

	{
		const test = ($$anchor) => {
			var a = root_1();

			$.append($$anchor, a);
		};

		var node = $.child(div);

		test(node);
		$.reset(div);
	}

	var node_1 = $.sibling(div, 2);

	Div(node_1, {
		children: ($$anchor, $$slotProps) => {
			var a_1 = root_2();

			$.append($$anchor, a_1);
		},
		$$slots: { default: true }
	});

	$.append($$anchor, fragment);
}