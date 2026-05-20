import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, true);

	const rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'name']);

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${rest.name ?? ''} ${'name' in rest}`));
	$.append($$anchor, text);
	$.pop();
}