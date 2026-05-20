import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <!>`, 1);

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var message;
	var $$promises = $.run([async () => message = await $$props.push('hello from child')]);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	$.snippet(node, () => $$props.children);
	$.template_effect(() => $.set_text(text, `message: ${message ?? ''}`), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, fragment);
	$.pop();
}