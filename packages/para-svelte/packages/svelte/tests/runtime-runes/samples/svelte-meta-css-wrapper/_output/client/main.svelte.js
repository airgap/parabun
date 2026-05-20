import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.add_locations($.from_html(`<h1>hello</h1> <svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper> <p>goodbye</p>`, 1), Main[$.FILENAME], [[5, 0], [6, 0], [7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		$.css_props(node, () => ({ '--color': 'red' }));
		Component(node.lastChild, {});
		$.reset(node);
	}

	$.next(2);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}