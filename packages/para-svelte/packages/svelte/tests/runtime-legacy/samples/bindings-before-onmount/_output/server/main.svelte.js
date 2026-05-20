import * as $ from 'svelte/internal/server';
import One from './One.svelte';

export default function Main($$renderer, $$props) {
	let one = $$props['one'];

	One($$renderer, {});
	$.bind_props($$props, { one });
}