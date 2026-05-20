import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Form from './form.svelte';

var root = $.add_locations($.from_html(`<form><div><!></div></form>`), Main[$.FILENAME], [[5, 0, [[6, 1]]]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var form = root();
	var div = $.child(form);
	var node = $.child(div);

	$.add_svelte_meta(() => Form(node, {}), 'component', Main, 7, 2, { componentTag: 'Form' });
	$.reset(div);
	$.reset(form);
	$.append($$anchor, form);

	return $.pop($$exports);
}