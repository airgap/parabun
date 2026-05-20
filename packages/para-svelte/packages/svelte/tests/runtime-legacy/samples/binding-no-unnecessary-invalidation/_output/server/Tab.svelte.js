import * as $ from 'svelte/internal/server';

export default function Tab($$renderer, $$props) {
	let tab = $$props['tab'];

	$.bind_props($$props, { tab });
}