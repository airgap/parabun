import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>Foo</p> <p>Bar</p>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var p = $.first_child(fragment);

	$.set_class(p, 1, $.clsx(undefined), 'svelte-xyz');

	var p_1 = $.sibling(p, 2);

	$.set_class(p_1, 1, undefined, 'svelte-xyz');
	$.append($$anchor, fragment);
}