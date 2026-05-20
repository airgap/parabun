import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

const my_snippet = ($$anchor) => {
	var span = root_1();

	$.append($$anchor, span);
};

var root_1 = $.from_html(`<span class="svelte-xyz">Hello world</span>`);
var root_2 = $.from_html(`<span class="svelte-xyz">Hello world</span>`);
var root = $.from_html(`<div class="svelte-xyz"><!></div> <p class="svelte-xyz"><strong><!></strong></p>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var div = $.first_child(fragment);
	var node = $.child(div);

	my_snippet(node);
	$.reset(div);

	var p = $.sibling(div, 2);

	{
		const my_snippet = ($$anchor) => {
			var span_1 = root_2();

			$.append($$anchor, span_1);
		};

		var strong = $.child(p);
		var node_1 = $.child(strong);

		my_snippet(node_1);
		$.reset(strong);
		$.reset(p);
	}

	$.append($$anchor, fragment);
}