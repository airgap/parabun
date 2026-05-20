import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let list = $.prop($$props, 'list', 28, () => [1, 2]);

	var $$exports = {
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, list, $.index, ($$anchor, nested) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				Nested($$anchor, {
					get nested() {
						return $.get(nested);
					}
				});
			};

			$.if(node_1, ($$render) => {
				if (true) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}