import { createClassComponent as $$_createClassComponent } from 'svelte/legacy';
import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';
import Inner from './inner.svelte';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	if (new.target) return $$_createClassComponent({ component: Main, ...$$anchor });

	$.push($$props, true);

	let target;

	onMount(() => {
		new Inner({ target, props: { num: 1 } });
	});

	var $$exports = {
		$set: $.update_legacy_props,
		$on: ($$event_name, $$event_cb) => $.add_legacy_event_listener($$props, $$event_name, $$event_cb)
	};

	var div = root();

	$.bind_this(div, ($$value) => target = $$value, () => target);
	$.append($$anchor, div);

	return $.pop($$exports);
}