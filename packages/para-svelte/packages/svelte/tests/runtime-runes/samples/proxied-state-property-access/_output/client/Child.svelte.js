import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { settings } from './main.svelte';

export default function Child($$anchor, $$props) {
	$.push($$props, true);
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `Child: ${settings.showInRgb ?? ''}`));
	$.append($$anchor, text);
	$.pop();
}