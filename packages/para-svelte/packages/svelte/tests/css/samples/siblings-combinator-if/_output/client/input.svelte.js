import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root_2 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root_3 = $.from_html(`<div class="d svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="e svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let foo = true;
	let bar = true;
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.append($$anchor, div);
		};

		var consequent_1 = ($$anchor) => {
			var div_1 = root_2();

			$.append($$anchor, div_1);
		};

		var alternate = ($$anchor) => {
			var div_2 = root_3();

			$.append($$anchor, div_2);
		};

		$.if(node, ($$render) => {
			if (foo) $$render(consequent); else if (bar) $$render(consequent_1, 1); else $$render(alternate, -1);
		});
	}

	$.next(2);
	$.append($$anchor, fragment);
}