import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	let data = [1, 1, 1];
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 16, () => data, (d) => d, ($$anchor, d) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, d));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);
}