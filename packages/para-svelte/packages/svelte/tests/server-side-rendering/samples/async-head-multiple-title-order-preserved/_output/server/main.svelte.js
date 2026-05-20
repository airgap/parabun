import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { tick } from 'svelte';
import A from './A.svelte';
import B from './B.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const main = Promise.withResolvers();
		const a = Promise.withResolvers();
		const b = Promise.withResolvers();

		// regardless of resolution order, title should be the result of B, because it's the last-encountered
		tick().then(() => {
			main.resolve(true);

			tick().then(() => {
				b.resolve(true);
			}).then(() => {
				a.resolve(true);
			});
		});

		$.head('1v6gwdg', $$renderer, ($$renderer) => {
			$$renderer.child_block(async ($$renderer) => {
				if ((await $.save(main.promise))()) {
					$$renderer.push('<!--[0-->');

					$$renderer.title(($$renderer) => {
						$$renderer.push(`<title>Main</title>`);
					});
				} else {
					$$renderer.push('<!--[-1-->');
				}
			});

			$$renderer.push(`<!--]-->`);
		});

		A($$renderer, { promise: a.promise });
		$$renderer.push(`<!----> `);
		B($$renderer, { promise: b.promise });
		$$renderer.push(`<!---->`);
	});
}