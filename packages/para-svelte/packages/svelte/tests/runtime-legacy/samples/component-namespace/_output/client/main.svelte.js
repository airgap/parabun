import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { Widget } from './Widget.svelte';

export default function Main($$anchor) {
	let widgets = [Widget];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => widgets, $.index, ($$anchor, LazyWidget) => {
		$.get(LazyWidget).Tooltip($$anchor, {});
	});

	$.append($$anchor, fragment);
}