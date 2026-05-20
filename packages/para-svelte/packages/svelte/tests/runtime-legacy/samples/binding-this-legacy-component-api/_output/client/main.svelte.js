import { createClassComponent as $$_createClassComponent } from 'svelte/legacy';
import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Sub from './sub.svelte';
import { onMount } from 'svelte';

export default function Main($$anchor, $$props) {
	if (new.target) return $$_createClassComponent({ component: Main, ...$$anchor });

	$.push($$props, false);

	let count = 0;
	let component = $.mutable_source();

	onMount(() => {
		$.get(component).$on('increment', (e) => {
			count += e.detail;
			$.get(component).$set({ count });
		});
	});

	var $$exports = {
		$set: $.update_legacy_props,
		$on: ($$event_name, $$event_cb) => $.add_legacy_event_listener($$props, $$event_name, $$event_cb)
	};

	$.init();
	$.bind_this(Sub($$anchor, { $$legacy: true }), ($$value) => $.set(component, $$value), () => $.get(component));

	return $.pop($$exports);
}