import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root_2 = $.from_html(`<p>hello</p>`);
var root_1 = $.from_html(`<div><!></div> <div><!></div>`, 1);

export default function Main($$anchor) {
	var b, a;

	var $$promises = $.run([
		() => 1,
		() => {
			b = true;
			a = true;
		}
	]);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, (node) => {
		var consequent_1 = ($$anchor) => {
			var fragment_1 = root_1();
			var div = $.first_child(fragment_1);
			var node_1 = $.child(div);

			$.async(node_1, [$$promises[1]], void 0, (node_1) => {
				var consequent = ($$anchor) => {
					var p = root_2();

					$.append($$anchor, p);
				};

				$.if(node_1, ($$render) => {
					if (b) $$render(consequent);
				});
			});

			$.reset(div);

			var div_1 = $.sibling(div, 2);
			var node_2 = $.child(div_1);

			$.async(node_2, [$$promises[1]], void 0, ($$anchor) => {
				Child(node_2, {
					get b() {
						return b;
					}
				});
			});

			$.reset(div_1);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (a) $$render(consequent_1);
		});
	});

	$.append($$anchor, fragment);
}