import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><p class="before svelte-xyz">before</p> <!> <p class="foo svelte-xyz"><span class="svelte-xyz">foo</span></p> <p class="bar svelte-xyz">bar</p></div> <!>`, 1);

export default function Input($$anchor) {
	let tag = 'div';
	var fragment = root();
	var div = $.first_child(fragment);
	var node = $.sibling($.child(div), 2);

	$.element(node, () => tag, false, ($$element, $$anchor) => {
		$.set_class($$element, 0, 'x svelte-xyz');
	});

	$.next(4);
	$.reset(div);

	var node_1 = $.sibling(div, 2);

	$.each(node_1, 0, () => [1], $.index, ($$anchor, $$item) => {
		var fragment_1 = $.comment();
		var node_2 = $.first_child(fragment_1);

		$.element(node_2, () => tag, false, ($$element_1, $$anchor) => {
			$.set_class($$element_1, 0, 'z svelte-xyz');
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}