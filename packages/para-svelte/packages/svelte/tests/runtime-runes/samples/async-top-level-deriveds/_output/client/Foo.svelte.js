import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { resolve } from './main.svelte';

var root = $.from_html(`<p> </p>`);

export default function Foo($$anchor, $$props) {
	$.push($$props, true);

	var foo, bar;

	var $$promises = $.run([
		async () => foo = await $.async_derived(() => new Promise((r) => resolve.push(() => r('foo')))),
		async () => bar = await $.async_derived(() => new Promise((r) => resolve.push(() => r('bar'))))
	]);

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$.get(foo) ?? ''} ${$.get(bar) ?? ''}`), void 0, void 0, [$$promises[0], $$promises[1]]);
	$.append($$anchor, p);
	$.pop();
}