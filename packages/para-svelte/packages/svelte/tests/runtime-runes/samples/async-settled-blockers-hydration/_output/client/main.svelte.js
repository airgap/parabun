import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

const child = ($$anchor, n = $.noop) => {
	var div = root_1();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, n()));
	$.append($$anchor, div);
};

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <p>after</p>`, 1);

export default function Main($$anchor) {
	var n;

	var $$promises = $.run([
		async () => n = await $.async_derived(() => Promise.resolve(1))
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[0]], void 0, (node) => {
		var consequent = ($$anchor) => {
			$.async($$anchor, [$$promises[0]], void 0, ($$anchor) => {
				child($$anchor, () => $.get(n));
			});

			$.next();
		};

		$.if(node, ($$render) => {
			if ($.get(n)) $$render(consequent);
		});
	});

	$.next(2);
	$.append($$anchor, fragment);
}