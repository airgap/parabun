import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.child_block(async ($$renderer) => {
		if ((await $.save(Promise.resolve(false)))()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await Promise.reject('no no no')));
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(async () => $.escape(await Promise.resolve('yes yes yes')));
		}
	});

	$$renderer.push(`<!--]-->`);
}