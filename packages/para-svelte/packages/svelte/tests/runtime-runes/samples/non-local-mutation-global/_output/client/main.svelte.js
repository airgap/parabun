import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './child.svelte';
import { global } from './state.svelte.js';

var root = $.add_locations($.from_html(`<!> <button> </button>`, 1), Main[$.FILENAME], [[10, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);
	global.value.count = 0;

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.validate_binding('bind:a={global.value}', [], () => global, () => 'value', 8, 7);

	$.add_svelte_meta(
		() => Child(node, {
			get a() {
				return global.value;
			},

			set a($$value) {
				global.value = $$value;
			}
		}),
		'component',
		Main,
		8,
		0,
		{ componentTag: 'Child' }
	);

	var button = $.sibling(node, 2);
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${global.value.count ?? ''}`));

	$.delegated('click', button, function click() {
		return global.value.count++;
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);