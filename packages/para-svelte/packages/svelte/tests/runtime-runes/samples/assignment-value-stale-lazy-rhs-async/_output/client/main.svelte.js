import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>go</button> <p> </p>`, 1), Main[$.FILENAME], [[17, 0], [18, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let count1 = $.tag($.state(0), 'count1');
	let count2 = $.tag($.state(0), 'count2');
	let cache = $.tag_proxy($.proxy({}), 'cache');

	async function go() {
		$.update(count1);

		const value = (await $.track_reactivity_loss($.assign_async(cache, 'value', '??=', () => get_value(), 'main.svelte:8:16')))();
	}

	function get_value() {
		$.update(count2);

		return 42;
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `count1: ${$.get(count1) ?? ''}, count2: ${$.get(count2) ?? ''}`));
	$.delegated('click', button, go);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);