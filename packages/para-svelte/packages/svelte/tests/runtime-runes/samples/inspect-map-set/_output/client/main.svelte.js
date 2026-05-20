import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

var root = $.add_locations($.from_html(`<button>Map</button> <button>Set</button>`, 1), Main[$.FILENAME], [[11, 0], [12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let map = new SvelteMap();
	let set = new SvelteSet();

	$.inspect(() => [map], (...$$args) => console.log(...$$args), true);
	$.inspect(() => [set], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);

	$.delegated('click', button, function click() {
		return map.set('a', 'a');
	});

	$.delegated('click', button_1, function click_1() {
		return set.add('a');
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);