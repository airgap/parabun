import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>attachment did not run</div>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.async(node_1, [], [() => true], (node_1, $$condition) => {
		var consequent = ($$anchor) => {
			var div = root_1();

			$.attach(div, () => (node) => {
				node.textContent = 'attachment ran';
			});

			$.append($$anchor, div);
		};

		$.if(node_1, ($$render) => {
			if ($.get($$condition)) $$render(consequent);
		});
	});

	$.append($$anchor, fragment);
}