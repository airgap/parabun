import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12);

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		let $0 = $.derived_safe_equal(() => (
			$.deep_read_state(props()),
			$.untrack(() => Array.isArray(props()) ? props()[0] : props().a)
		));

		$.slot(
			node,
			$$props,
			'default',
			{
				get value() {
					return props();
				},

				get data() {
					return $.get($0);
				}
			},
			null
		);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}