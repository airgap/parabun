import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

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

			$.if(node, ($$render) => {
				if (condition()) $$render(consequent);
			});
		}

		$.append($$anchor, fragment);
	});

	return $.pop($$exports);
}