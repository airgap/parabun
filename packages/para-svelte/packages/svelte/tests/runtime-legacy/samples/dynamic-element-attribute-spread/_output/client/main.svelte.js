import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 28, () => ({ disabled: false, type: 'button', 'data-named': 'foo' }));

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => "button", false, ($$element, $$anchor) => {
		$.attribute_effect($$element, () => ({ ...props() }));

		var text = $.text('Click me');

		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}