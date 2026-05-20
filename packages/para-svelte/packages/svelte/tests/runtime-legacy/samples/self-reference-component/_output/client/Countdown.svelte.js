import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Countdown($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.slot(
				node_1,
				$$props,
				'default',
				{
					get count() {
						return count() - 1;
					}
				},
				null
			);

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (count() > 0) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}