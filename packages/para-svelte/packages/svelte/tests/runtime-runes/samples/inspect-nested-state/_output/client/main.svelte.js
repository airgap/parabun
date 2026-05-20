import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let x = $.tag_proxy($.proxy({ count: 0 }), 'x');

	$.inspect(() => [{ x }, [x]], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, x.count));

	$.event('click', button, function click() {
		return x.count++;
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}