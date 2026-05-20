import * as $ from 'svelte/internal/server';
import Level1 from './Level1.svelte';

export default function Main($$renderer, $$props) {
	let l1 = $$props['l1'];

	Level1($$renderer, {});
	$.bind_props($$props, { l1 });
}