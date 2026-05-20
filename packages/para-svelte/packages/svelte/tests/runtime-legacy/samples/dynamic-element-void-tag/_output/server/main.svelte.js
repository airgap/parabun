import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let propTag = $$props['propTag'];
	const static_tag = 'input';
	const func_tag = () => 'br';

	$$renderer.push(`<h1></h1> `);
	$.element($$renderer, 'foo');
	$$renderer.push(` `);
	$.element($$renderer, "img");
	$$renderer.push(` `);
	$.element($$renderer, propTag);
	$$renderer.push(` `);
	$.element($$renderer, static_tag);
	$$renderer.push(` `);
	$.element($$renderer, func_tag());
	$.bind_props($$props, { propTag });
}