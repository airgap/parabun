import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const tag = "div";
	let onClick = $.prop($$props, 'onClick', 12);

	var $$exports = {
		get onClick() {
			return onClick();
		},

		set onClick($$value) {
			onClick($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => tag, false, ($$element, $$anchor) => {
		$.attribute_effect($$element, () => ({ style: 'display: inline;' }));

		$.event('click', $$element, function (...$$args) {
			onClick()?.apply(this, $$args);
		});

		var text = $.text('Foo');

		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}