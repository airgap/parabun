import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>this is styled</p> <p class="bar">this is unstyled</p>`, 1);

export default function Input($$anchor, $$props) {
	let unknown = $.prop($$props, 'unknown', 8, 'whatever');
	var fragment = root();
	var p = $.first_child(fragment);

	$.next(2);
	$.template_effect(() => $.set_class(p, 1, unknown(), 'svelte-xyz'));
	$.append($$anchor, fragment);
}