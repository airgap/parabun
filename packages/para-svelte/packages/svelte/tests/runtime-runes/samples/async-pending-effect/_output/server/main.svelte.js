import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer) {
	let condition = false;

	$$renderer.push(`<button>toggle</button> `);
	$$renderer.push(`<!--[!-->`);

	{
		Component($$renderer, {});
	}

	$$renderer.push(`<!--]-->`);
	$$renderer.push(` `);

	if (condition) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>hello</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
}