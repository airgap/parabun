import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let foo = false;
	var blocking, bar;

	var $$promises = $$renderer.run([
		async () => blocking = await $.async_derived(() => foo),
		() => bar = Promise.resolve(true)
	]);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (foo) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`foo`);
		} else {
			$$renderer.push('<!--[-1-->');

			$$renderer.async_block([$$promises[1]], async ($$renderer) => {
				if ((await $.save(bar))()) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`bar`);
				} else {
					$$renderer.push('<!--[-1-->');
					$$renderer.push(`else`);
				}
			});

			$$renderer.push(`<!--]-->`);
		}
	});

	$$renderer.push(`<!--]--> `);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		if (foo) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`foo`);
		} else if (!blocking()) {
			$$renderer.push('<!--[1-->');
			$$renderer.push(`blocking`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`else`);
		}
	});

	$$renderer.push(`<!--]-->`);
}