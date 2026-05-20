import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <div></div>`, 1);

export default function Inner($$anchor) {
	function renderContent(node) {
		node.textContent = 'foo';
	}

	var test;
	var $$promises = $.run([async () => test = await Promise.resolve('foo')]);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var div = $.sibling(p, 2);

	$.attach(div, () => renderContent);
	$.template_effect(() => $.set_text(text, test), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, fragment);
}