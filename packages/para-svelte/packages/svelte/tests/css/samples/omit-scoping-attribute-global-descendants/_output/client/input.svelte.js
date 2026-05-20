import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><section><p class="svelte-xyz">hello</p></section></div>`);

export default function Input($$anchor, $$props) {
	let unknown1 = $.prop($$props, 'unknown1', 8, 'root');
	let unknown2 = $.prop($$props, 'unknown2', 8, 'whatever');
	var div = root();
	var section = $.child(div);

	$.reset(div);

	$.template_effect(() => {
		$.set_class(div, 1, $.clsx(unknown1()), 'svelte-xyz');
		$.set_class(section, 1, $.clsx(unknown2()), 'svelte-xyz');
	});

	$.append($$anchor, div);
}