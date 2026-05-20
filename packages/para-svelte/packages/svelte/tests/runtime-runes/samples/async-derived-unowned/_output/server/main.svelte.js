import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		const double = $.derived(() => count * 2);

		$$renderer.push(`<!--[!-->`);

		{}

		$$renderer.push(`<!--]-->`);
		$$renderer.push(` <button>${$.escape(count)}</button> `);

		if (count > 0) {
			$$renderer.push('<!--[0-->');
			Component($$renderer, { double: double() });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}