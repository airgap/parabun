import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Form from './form.svelte';
import H1 from './h1.svelte';

var root = $.add_locations($.from_html(`<p><!></p> <form><!></form>`, 1), Main[$.FILENAME], [[6, 0], [9, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var p = $.first_child(fragment);
	var node = $.child(p);

	$.add_svelte_meta(() => H1(node, {}), 'component', Main, 7, 1, { componentTag: 'H1' });
	$.reset(p);

	var form = $.sibling(p, 2);
	var node_1 = $.child(form);

	$.add_svelte_meta(() => Form(node_1, {}), 'component', Main, 10, 1, { componentTag: 'Form' });
	$.reset(form);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}