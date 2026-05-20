import * as $ from 'svelte/internal/server';
import List from './List.svelte';

export default function Main($$renderer, $$props) {
	let list = $$props['list'];

	List($$renderer, {});
	$.bind_props($$props, { list });
}