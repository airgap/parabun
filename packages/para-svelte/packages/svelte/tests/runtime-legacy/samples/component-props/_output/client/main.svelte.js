import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, ['visible']);
	let visible = $.prop($$props, 'visible', 8);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var text = $.text();

			$.template_effect(($0, $1) => $.set_text(text, `${$0 ?? ''} ${$1 ?? ''}`), [
				() => (
					$.deep_read_state($$sanitized_props),
					$.untrack(() => JSON.stringify($$sanitized_props))
				),

				() => (
					$.deep_read_state($$restProps),
					$.untrack(() => JSON.stringify($$restProps))
				)
			]);

			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
}