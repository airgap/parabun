import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let attack = $.fallback($$props['attack'], '" onload="alert(\'uhoh\')" data-nothing="not important');

	$$renderer.push(`<div${$.attr_style('', { '--css-variable': attack })}></div>`);
	$.bind_props($$props, { attack });
}