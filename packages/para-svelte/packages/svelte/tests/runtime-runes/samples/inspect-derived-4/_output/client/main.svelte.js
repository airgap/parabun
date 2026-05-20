import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { SvelteSet } from "svelte/reactivity";

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const ids = [0, 1, 2];
	const seenIds = new SvelteSet();
	const unseenIds = $.tag($.derived(() => ids.filter((id) => !seenIds.has(id))), 'unseenIds');
	const currentId = $.tag($.derived(() => $.get(unseenIds).at(0)), 'currentId');

	$.inspect(() => [$.get(unseenIds)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `first unseen: ${$.get(currentId) ?? ''}`));

	$.delegated('click', button, function click() {
		return seenIds.add($.get(currentId));
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);