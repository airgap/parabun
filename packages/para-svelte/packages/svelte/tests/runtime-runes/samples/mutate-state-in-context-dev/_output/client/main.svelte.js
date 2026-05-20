import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

let obj = $.tag_proxy($.proxy({}), 'obj');

obj.test = "hi!";

var root = $.add_locations($.from_html(`<h1> </h1>`), Main[$.FILENAME], [[6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(($0) => $.set_text(text, `Values: ${$0 ?? ''}`), [() => JSON.stringify(obj)]);
	$.append($$anchor, h1);

	return $.pop($$exports);
}