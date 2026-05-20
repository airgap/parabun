import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.child_block(async ($$renderer) => {
		if ((await $.save(true))()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>attachment did not run</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]-->`);
}