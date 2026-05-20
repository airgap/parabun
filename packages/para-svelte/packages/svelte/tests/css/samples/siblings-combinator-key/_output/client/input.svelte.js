import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div class="b svelte-xyz"></div>`);
var root = $.from_html(`<div class="a svelte-xyz"></div> <!> <div class="c svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	$.key(node, () => x, ($$anchor) => {
		var div = root_1();

		$.append($$anchor, div);
	});

	$.next(2);
	$.append($$anchor, fragment);
}