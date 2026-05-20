import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Inner($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	Foo($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = $.comment();
			var node = $.first_child(fragment_1);

			$.slot(node, $$props, 'default', {}, ($$anchor) => {
				var text = $.text();

				$.template_effect(($0) => $.set_text(text, $0), [
					() => (
						$.deep_read_state($$sanitized_props),
						$.untrack(() => JSON.stringify($$sanitized_props))
					)
				]);

				$.append($$anchor, text);
			});

			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});
}