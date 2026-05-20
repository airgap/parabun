import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function B($$renderer, $$props) {
	let { name, content } = $$props;

	$.head('1lj1c2i', $$renderer, ($$renderer) => {
		$$renderer.push(`<meta${$.attr('name', `${$.stringify(name)}-1`)}${$.attr('content', `${$.stringify(content)}-1`)}/> <meta${$.attr('name', `${$.stringify(name)}-2`)}${$.attr('content', `${$.stringify(content)}-2`)}/>`);
	});
}