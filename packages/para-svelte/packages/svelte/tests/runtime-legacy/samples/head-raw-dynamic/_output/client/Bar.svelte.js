import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<meta id="meta" name="title" content="bar!!!"/> <!>`, 1);

export default function Bar($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.head('n50t4b', ($$anchor) => {
		var fragment = root_1();
		var node = $.sibling($.first_child(fragment), 2);

		{
			var consequent = ($$anchor) => {
				var fragment_1 = $.comment();
				var node_1 = $.first_child(fragment_1);

				$.html(node_1, bar);
				$.append($$anchor, fragment_1);
			};

			$.if(node, ($$render) => {
				if (true) $$render(consequent);
			});
		}

		$.effect(() => {
			$.document.title = 'bar!!!';
		});

		$.append($$anchor, fragment);
	});

	return $.pop($$exports);
}