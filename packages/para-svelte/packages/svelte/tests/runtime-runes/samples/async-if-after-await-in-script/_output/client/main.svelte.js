import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>yep</p>`);
var root_2 = $.from_html(`<p>nope</p>`);

export default function Main($$anchor) {
	var condition;
	var $$promises = $.run([() => 0, async () => condition = await true]);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, (node) => {
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var alternate = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if (condition) $$render(consequent); else $$render(alternate, -1);
		});
	});

	$.append($$anchor, fragment);
}