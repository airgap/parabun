import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Widget($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(node, () => null, ($$anchor) => {});
	$.append($$anchor, fragment);
}