import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[6, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const $store = () => (
		$.validate_store(store, 'store'),
		$.store_get(store, '$store', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	let store = writable(0);
	var $$exports = { ...$.legacy_api() };

	$.init();

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${$store() ?? ''}`));

	$.delegated('click', button, function click() {
		if (store && $store()) {}
	});

	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);