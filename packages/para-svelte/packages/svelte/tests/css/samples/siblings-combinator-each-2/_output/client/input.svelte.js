import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div> <div class="c svelte-xyz"></div>`, 1);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="d svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	let array = [1];
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.each(node, 1, () => array, $.index, ($$anchor, item) => {
		var fragment_1 = root_1();

		$.next(2);
		$.append($$anchor, fragment_1);
	});

	$.next(2);
	$.append($$anchor, fragment);
}