import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let clicked = $.prop($$props, 'clicked', 12);

	var $$exports = {
		get clicked() {
			return clicked();
		},

		set clicked($$value) {
			clicked($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 0, () => ['x'], $.index, ($$anchor, letter) => {
		Widget($$anchor, { handleClick: () => clicked(letter) });
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}