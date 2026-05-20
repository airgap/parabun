import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Child from './App.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const store_container = $.mutable_source({ store: writable('Hello World') });

	function update_value(value) {
		$.mutate(store_container, $.get(store_container).store = writable(value));
	}

	var $$exports = { update_value };

	$.init();

	Child($$anchor, {
		get store_container() {
			return $.get(store_container);
		}
	});

	$.bind_prop($$props, 'update_value', update_value);

	return $.pop($$exports);
}