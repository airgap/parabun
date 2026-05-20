import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const func = 100;

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			const computed_const = $.derived_safe_equal(() => {
				const [func_1] = [[12, 13, 14]];

				return { func_1 };
			});

			var text = $.text();

			$.template_effect(($0) => $.set_text(text, $0), [
				() => (
					$.deep_read_state($.get(computed_const).func_1),
					$.untrack(() => (() => JSON.stringify($.get(computed_const).func_1))())
				)
			]);

			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if (true) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}