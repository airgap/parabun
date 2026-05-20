import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<img alt=""/>`), Main[$.FILENAME], [[6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var img = root();

	$.template_effect(() => $.set_attribute(img, 'src', $$props.browser ? 'a' : 'b', true));
	$.append($$anchor, img);

	return $.pop($$exports);
}