import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

export default function Main($$renderer) {
	let shown = false;

	if (shown) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`Nothing`);
	} else {
		$$renderer.push('<!--[-1-->');

		if (Component) {
			$$renderer.push('<!--[-->');
			Component($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	}

	$$renderer.push(`<!--]-->`);
}