import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let array = [{ a: 1, c: 2 }];
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 1, () => array, $.index, ($$anchor, $$item) => {
			let a = () => $.get($$item).a;

			a();

			let b = $.derived_safe_equal(() => $.fallback($.get($$item).b, c));

			$.get(b);

			let c = () => $.get($$item).c;

			c();
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, `${a() ?? ''}${$.get(b) ?? ''}${c() ?? ''}`));
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