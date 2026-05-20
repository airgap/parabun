import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import child from './child.svelte';

export default function Main($$anchor) {
	const components = { child };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => components.child, ($$anchor, components_child) => {
		components_child($$anchor, {});
	});

	$.append($$anchor, fragment);
}