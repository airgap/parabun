import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			$.next();

			var text = $.text('loading');

			$.append($$anchor, text);
		};

		const failed = ($$anchor) => {
			$.next();

			var text_1 = $.text('oops');

			$.append($$anchor, text_1);
		};

		$.boundary(node, { pending, failed }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.async(node_1, [], [() => Promise.reject(new Error('oops'))], (node_1, $$collection) => {
				$.each(node_1, 16, () => $.get($$collection), $.index, ($$anchor, x) => {
					$.next();

					var text_2 = $.text('hi');

					$.append($$anchor, text_2);
				});
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}