import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div> <div></div>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var div = $.first_child(fragment);

	$.set_class(div, 1, 'zero svelte-xyz', null, {}, { first: true });

	var div_1 = $.sibling(div, 2);

	$.set_class(div_1, 1, 'svelte-xyz', null, {}, { second: true, third: true });
	$.append($$anchor, fragment);
}