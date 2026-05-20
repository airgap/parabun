import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function ComponentOne($$anchor) {
	$.next();

	var text = $.text('One');

	$.append($$anchor, text);
}