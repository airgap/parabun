import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 'world');

	$$renderer.push(`<div${$.attr('title', `\${inject} ${$.stringify(value)}`)}></div> <div${$.attr('title', `\`backtick ${$.stringify(value)}`)}></div> <div${$.attr('title', `back\\slash ${$.stringify(value)}`)}></div>`);
	$.bind_props($$props, { value });
}