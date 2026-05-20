import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor) {
	let scrollY = $.mutable_source();

	$.bind_window_scroll('y', () => $.get(scrollY), ($$value) => $.set(scrollY, $$value));
}