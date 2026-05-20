import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span></span> <div class="svelte-xyz"></div>`, 1);

export default function Input($$anchor) {
	var fragment = root();
	var span = $.first_child(fragment);

	$.set_class(span, 1, 'svelte-xyz', null, {}, { foo: true });

	var div = $.sibling(span, 2);

	$.set_style(div, '', {}, { '--foo': 'bar' });
	$.append($$anchor, fragment);
}