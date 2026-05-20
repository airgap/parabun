import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<input type="checkbox"/> <!>`, 1);

export default function Main($$anchor) {
	let checked = $.state(false);
	var foo;

	var $$promises = $.run([
		async () => foo = await $.async_derived(() => $.get(checked))
	]);

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var node = $.sibling(input, 2);

	$.async(node, [$$promises[0]], void 0, (node) => {
		$.each(node, 17, () => $.get(checked) === $.get(foo) && [1], $.index, ($$anchor, $$item) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(checked)), void 0, void 0, [$$promises[0]]);
			$.append($$anchor, p);
		});
	});

	$.run_after_blockers([$$promises[0]], () => {
		$.bind_checked(input, () => $.get(checked), ($$value) => $.set(checked, $$value));
	});

	$.append($$anchor, fragment);
}