import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer) {
	var X, Y;

	var $$promises = $$renderer.run([
		async () => X = await $.async_derived(() => Promise.resolve(Component)),
		async () => Y = await Promise.resolve(Component)
	]);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (X()) {
			$$renderer.push('<!--[-->');
			X()($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	});

	$$renderer.push(` `);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (X()) {
			$$renderer.push('<!--[-->');
			X()($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	});

	$$renderer.push(` `);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		Y($$renderer, {});
	});

	$$renderer.push(` `);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (Y) {
			$$renderer.push('<!--[-->');
			Y($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	});
}