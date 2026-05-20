import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>some stuff</div>`);

export default function Input($$anchor, $$props) {
	let a = $.prop($$props, 'a', 8);
	let b = $.prop($$props, 'b', 8);
	let c = $.prop($$props, 'c', 8);
	var div = root();

	$.template_effect(() => $.set_class(div, 1, `foo${a() ? ' aa' : b() ? ' bb ' : c() ? 'cc ' : 'dd'}bar baz ${a() ? ' aa' : b() ? ' bb ' : c() ? 'cc ' : 'dd'}`, 'svelte-xyz'));
	$.append($$anchor, div);
}