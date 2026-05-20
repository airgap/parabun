import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let object = null;
	let count = 0;
	const condition = $.derived(() => object === null);

	$$renderer.push(`<!--[!-->`);

	{}

	$$renderer.push(`<!--]-->`);
}