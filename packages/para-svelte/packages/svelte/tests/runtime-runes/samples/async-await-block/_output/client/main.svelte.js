import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var foo;
	var $$promises = $.run([async () => foo = await $.async_derived(() => 1)]);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[0]], [], (node) => {
		$.await(node, () => $.get(foo), null, ($$anchor, x) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(x)));
			$.append($$anchor, p);
		});
	});

	$.append($$anchor, fragment);
}