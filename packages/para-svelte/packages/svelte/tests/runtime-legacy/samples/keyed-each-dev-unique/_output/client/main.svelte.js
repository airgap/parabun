import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const array = [1, 2, 3, 1];
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 1, () => array, (item) => item, ($$anchor, item) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(item)));
			$.append($$anchor, text);
		}),
		'each',
		Main,
		5,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}