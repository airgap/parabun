import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor) {
	$.next();

	var text = $.text('Child');

	$.append($$anchor, text);
}