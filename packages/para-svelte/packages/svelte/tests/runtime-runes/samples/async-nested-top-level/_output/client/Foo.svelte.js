import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { resolve } from './main.svelte';
import Bar from './Bar.svelte';

var root = $.from_html(`<p> </p> <!>`, 1);

export default function Foo($$anchor, $$props) {
	$.push($$props, true);

	var foo;

	var $$promises = $.run([
		async () => foo = await new Promise((r) => resolve.push(() => r('foo')))
	]);

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	Bar(node, {});
	$.template_effect(() => $.set_text(text, `foo: ${foo ?? ''}`), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, fragment);
	$.pop();
}