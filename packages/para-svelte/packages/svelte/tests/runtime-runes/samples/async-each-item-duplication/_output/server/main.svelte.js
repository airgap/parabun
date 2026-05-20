import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer) {
	var messages, another;

	var $$promises = $$renderer.run([
		async () => messages = await Promise.resolve(["item 1", "item 2", "item 3"]),
		() => another = { test: 'test' }
	]);

	$$renderer.push(`<!--[-->`);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		const each_array = $.ensure_array_like(messages);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let message = each_array[$$index];

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Component($$renderer, { message, another });
			});
		}
	});

	$$renderer.push(`<!--]-->`);
}