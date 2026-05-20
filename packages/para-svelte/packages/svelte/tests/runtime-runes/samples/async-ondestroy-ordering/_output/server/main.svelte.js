import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { onDestroy } from 'svelte';
import { destroyed } from './destroyed.js';
import A from './A.svelte';
import B from './B.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		onDestroy(() => destroyed.push('root'));

		$$renderer.child_block(async ($$renderer) => {
			if ((await $.save(Promise.resolve(true)))()) {
				$$renderer.push('<!--[0-->');
				A($$renderer, {});
			} else {
				$$renderer.push('<!--[-1-->');
			}
		});

		$$renderer.push(`<!--]--> `);
		B($$renderer, {});
		$$renderer.push(`<!---->`);
	});
}