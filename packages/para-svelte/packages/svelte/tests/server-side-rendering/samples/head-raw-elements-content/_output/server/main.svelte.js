import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	const dynamic_value = 'bar';

	$$renderer.push(`<div${$.attr_class(`${$.stringify(dynamic_value)} baz`, 'svelte-1iut2mq')}>bar</div> <div${$.attr_class(`foo ${$.stringify(dynamic_value)} baz`, 'svelte-1iut2mq')}>bar</div>`);
}