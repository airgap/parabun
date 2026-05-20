import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getAllContexts } from 'svelte';

var root_1 = $.from_html(`<div> </div>`);

export default function Leaf($$anchor, $$props) {
	$.push($$props, false);

	const context = getAllContexts();

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($.untrack(() => [...context.keys()])), $.index, ($$anchor, key) => {
		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.template_effect(($0) => $.set_text(text, `${$.get(key) ?? ''}: ${$0 ?? ''}`), [() => ($.get(key), $.untrack(() => context.get($.get(key))))]);
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.pop();
}