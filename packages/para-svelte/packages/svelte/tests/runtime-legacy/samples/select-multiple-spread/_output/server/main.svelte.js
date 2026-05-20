import * as $ from 'svelte/internal/server';
import Select from './select.svelte';

export default function Main($$renderer, $$props) {
	let attrs = $.fallback($$props['attrs'], () => ({ value: ['1'] }), true);

	Select($$renderer, { attrs });
	$.bind_props($$props, { attrs });
}