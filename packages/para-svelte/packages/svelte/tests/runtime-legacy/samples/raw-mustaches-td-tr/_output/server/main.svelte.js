import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let raw = $$props['raw'];

	$$renderer.push(`<table><tbody><tr><td>5</td><td>7</td></tr>${$.html(raw)}</tbody></table>`);
	$.bind_props($$props, { raw });
}