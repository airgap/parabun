import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function A($$renderer, $$props) {
	let { name, content } = $$props;

	$.head('1lj1c2h', $$renderer, ($$renderer) => {
		$$renderer.push(`<meta${$.attr('name', name)}${$.attr('content', content)}/>`);
	});
}