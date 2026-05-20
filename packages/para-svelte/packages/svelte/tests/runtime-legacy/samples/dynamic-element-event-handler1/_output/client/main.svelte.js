import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const tag = "button";
	let handler = $.prop($$props, 'handler', 12);

	var $$exports = {
		get handler() {
			return handler();
		},

		set handler($$value) {
			handler($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => tag, false, ($$element, $$anchor) => {
		$.event('click', $$element, function (...$$args) {
			handler()?.apply(this, $$args);
		});

		var text = $.text('Foo');

		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}