import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.push(`<!--[-->`);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save('hello'))();

		$.slot($$renderer, $$props, 'default', { message: $$0 }, null);
	});

	$$renderer.push(`<!--]-->`);
}