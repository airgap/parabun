import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';
import { count } from './store.js';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $count = () => $.store_get(count, '$count', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	function increment() {
		$.update_store(count, $count());
	}

	var $$exports = { increment };

	Nested($$anchor, {});
	$.bind_prop($$props, 'increment', increment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}