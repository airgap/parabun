import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_3 = $.from_html(`<meta id="meta" name="title" content="woo!!!"/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let condition = $.prop($$props, 'condition', 12);

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	$.head('70s021', ($$anchor) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		{
			var consequent = ($$anchor) => {
				$.effect(() => {
					$.document.title = 'woo!!!';
				});
			};

			var alternate = ($$anchor) => {
				var meta = root_3();

				$.append($$anchor, meta);
			};

			$.if(node, ($$render) => {
				if (condition()) $$render(consequent); else $$render(alternate, -1);
			});
		}

		$.append($$anchor, fragment);
	});

	return $.pop($$exports);
}