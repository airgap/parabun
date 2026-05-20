import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 12);
	let condition = $.prop($$props, 'condition', 12, true);

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		},

		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.await(node_1, promise, null, ($$anchor, _) => {
				var text = $.text('hello');

				$.append($$anchor, text);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (condition()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}