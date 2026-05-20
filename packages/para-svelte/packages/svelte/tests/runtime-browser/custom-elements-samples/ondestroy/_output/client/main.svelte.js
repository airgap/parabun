import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount, onDestroy } from "svelte";

var root = $.from_html(`<div></div>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let el = $.mutable_source();
	let parentEl;

	onMount(() => {
		parentEl = $.get(el).parentNode.host.parentElement;

		return () => {
			parentEl.dataset.onMountDestroyed = true;
		};
	});

	onDestroy(() => {
		parentEl.dataset.destroyed = true;
	});

	$.init();

	var div = root();

	$.bind_this(div, ($$value) => $.set(el, $$value), () => $.get(el));
	$.append($$anchor, div);
	$.pop();
}

customElements.define('my-app', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));