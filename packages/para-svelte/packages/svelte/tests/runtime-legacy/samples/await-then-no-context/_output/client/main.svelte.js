import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div>t</div>`);
var root_3 = $.from_html(`<div>waiting</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const promise = new Promise(() => {});
	const test = [1, 2, 3];

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		() => promise,
		($$anchor) => {
			var div_1 = root_3();

			$.append($$anchor, div_1);
		},
		($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 1, () => test, $.index, ($$anchor, t) => {
				var div = root_2();

				$.append($$anchor, div);
			});

			$.append($$anchor, fragment_1);
		}
	);

	$.append($$anchor, fragment);
	$.pop();
}