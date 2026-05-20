import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 1);
	const thrice = (num) => 3 * num;

	$$renderer.push(`<p>${$.escape(thrice(foo))}</p>`);
	$.bind_props($$props, { foo });
}