import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let raw = $$props['raw'];

	$$renderer.push(`<!---->before<br/>${$.html(raw)}<br/>after`);
	$.bind_props($$props, { raw });
}