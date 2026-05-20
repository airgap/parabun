import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let disabled = $.prop($$props, 'disabled', 12, false);

	var $$exports = {
		get disabled() {
			return disabled();
		},

		set disabled($$value) {
			disabled($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => "button", false, ($$element, $$anchor) => {
		$.attribute_effect($$element, () => ({ disabled: disabled() }));

		var text = $.text('Click me');

		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}