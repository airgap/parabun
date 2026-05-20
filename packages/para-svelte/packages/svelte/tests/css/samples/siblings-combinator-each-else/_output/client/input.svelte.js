import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root_2 = $.from_html(`<div class="c svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="d svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let array = [];
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.each(
		node,
		1,
		() => array,
		$.index,
		($$anchor, item) => {
			var div = root_1();

			$.append($$anchor, div);
		},
		($$anchor) => {
			var div_1 = root_2();

			$.append($$anchor, div_1);
		}
	);

	$.next(2);
	$.append($$anchor, fragment);
}