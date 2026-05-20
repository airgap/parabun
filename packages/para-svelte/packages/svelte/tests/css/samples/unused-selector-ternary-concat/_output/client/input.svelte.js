import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>some stuff</div>`);

export default function Input($$anchor, $$props) {
	let active = $.prop($$props, 'active', 8);
	var div = root();

	$.template_effect(() => $.set_class(div, 1, `thing ${active() ? 'active' : ''}`, 'svelte-xyz'));
	$.append($$anchor, div);
}