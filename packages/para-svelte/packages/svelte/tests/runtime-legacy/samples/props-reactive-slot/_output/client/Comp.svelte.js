import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Comp($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'default',
		{
			get props() {
				return $$sanitized_props;
			}
		},
		null
	);

	$.append($$anchor, fragment);
}