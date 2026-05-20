import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

export default function Main($$anchor) {
	var messages, another;

	var $$promises = $.run([
		async () => messages = await Promise.resolve(["item 1", "item 2", "item 3"]),
		() => another = { test: 'test' }
	]);

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[0]], void 0, (node) => {
		$.each(node, 17, () => messages, $.index, ($$anchor, message) => {
			{
				$.async($$anchor, [$$promises[1]], void 0, ($$anchor) => {
					Component($$anchor, {
						get message() {
							return $.get(message);
						},

						get another() {
							return another;
						}
					});
				});

				$.next();
			}
		});
	});

	$.append($$anchor, fragment);
}