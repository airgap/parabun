import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.add_locations($.from_html(`<button>Click me</button>`), Main[$.FILENAME], [[11, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $store = () => (
		$.validate_store(store, 'store'),
		$.store_get(store, '$store', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const store = writable(0);

	async function logStore() {
		console.log(...$.log_if_contains_state('log', $store()));
		store.set(100);
	}

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, logStore);
	$.append($$anchor, button);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);