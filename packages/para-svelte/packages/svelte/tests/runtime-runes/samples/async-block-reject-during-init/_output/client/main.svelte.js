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

		const failed = ($$anchor, e = $.noop) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, e().message));
			$.append($$anchor, text_1);
		};

		$.boundary(node, { pending, failed }, ($$anchor) => {
			var fragment_2 = $.comment();
			var node_1 = $.first_child(fragment_2);

			$.async(node_1, [], [() => Promise.reject(new Error('nope'))], (node_1, $$condition) => {
				var consequent = ($$anchor) => {
					var text_2 = $.text('hi');

					$.append($$anchor, text_2);
				};

				$.if(node_1, ($$render) => {
					if ($.get($$condition)) $$render(consequent);
				});
			});

			$.append($$anchor, fragment_2);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}