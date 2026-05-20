import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let currentUser = $$props['currentUser'];

	Nested($$renderer, { user: currentUser });
	$.bind_props($$props, { currentUser });
}