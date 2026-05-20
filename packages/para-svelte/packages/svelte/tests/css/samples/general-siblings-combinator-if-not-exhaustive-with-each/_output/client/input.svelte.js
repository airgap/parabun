import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root_3 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="d svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let foo = false;
	let array = [1];
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.append($$anchor, div);
		};

		var alternate = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 1, () => array, $.index, ($$anchor, item) => {
				var div_1 = root_3();

				$.append($$anchor, div_1);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (foo) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.next(2);
	$.append($$anchor, fragment);
}