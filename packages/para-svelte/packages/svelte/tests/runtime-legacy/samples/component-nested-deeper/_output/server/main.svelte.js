import * as $ from 'svelte/internal/server';
import Level1 from './Level1.svelte';

export default function Main($$renderer, $$props) {
	let values = $$props['values'];

	Level1($$renderer, { values });
	$.bind_props($$props, { values });
}