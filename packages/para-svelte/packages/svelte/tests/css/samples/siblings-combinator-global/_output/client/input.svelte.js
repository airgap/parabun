import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p class="svelte-xyz"></p>`);
var root = $.from_html(`<h1 class="svelte-xyz">Hello!</h1> <div class="svelte-xyz"><span>World!</span></div> <!>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 4);

	$.each(node, 0, () => [], $.index, ($$anchor, _) => {
		var p = root_1();

		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
}