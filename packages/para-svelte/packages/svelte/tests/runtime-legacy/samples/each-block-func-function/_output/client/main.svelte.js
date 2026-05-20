import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => [1, 2, 3, 4, 5], $.index, ($$anchor, func) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(($0) => $.set_text(text, $0), [() => (func, $.untrack(() => (() => func)()))]);
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);
	$.pop();
}