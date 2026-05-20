import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-9w8ujg"> </h1>`);

export default function Input($$anchor, $$props) {
	let foo = $.prop($$props, 'foo', 24, () => ({ bar: 5 }));
	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `multiple ${foo() ?? ''}`));
	$.append($$anchor, h1);
}