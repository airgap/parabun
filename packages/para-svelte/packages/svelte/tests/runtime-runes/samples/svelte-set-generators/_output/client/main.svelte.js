import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { SvelteSet } from 'svelte/reactivity';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	function* generator() {
		yield 1;
	}

	let gen = new SvelteSet(generator());
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 17, () => gen, $.index, ($$anchor, item) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(item)));
			$.append($$anchor, text);
		}),
		'each',
		Main,
		11,
		0
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}