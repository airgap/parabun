import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Input($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, () => "div", false, ($$element, $$anchor) => {
		$.set_class($$element, 0, 'used svelte-xyz');
	});

	$.append($$anchor, fragment);
}