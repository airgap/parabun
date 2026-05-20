import * as $ from 'svelte/internal/server';
import Select from './select.svelte';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], () => ['1'], true);
	let other = $.fallback($$props['other'], () => ({}), true);

	Select($$renderer, { value, other });
	$.bind_props($$props, { value, other });
}