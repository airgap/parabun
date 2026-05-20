import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Main($$anchor) {
	let eid = $.mutable_source(1);
	let foo = $.mutable_source();
	let employees = [{ id: $.set(eid, $.set(foo, 2)), name: 'xxx' }];
	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$.get(eid) ?? ''}`));
	$.append($$anchor, h1);
}