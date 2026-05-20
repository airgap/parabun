import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><p class="before svelte-xyz">before</p> <!> <p class="foo svelte-xyz"><span class="svelte-xyz">foo</span></p> <p class="bar svelte-xyz">bar</p></div>`);

export default function Input($$anchor, $$props) {
	var div = root();
	var node = $.sibling($.child(div), 2);

	$.slot(node, $$props, 'default', {}, null);
	$.next(4);
	$.reset(div);
	$.append($$anchor, div);
}