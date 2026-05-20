import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function A($$renderer, $$props) {
	let { promise } = $$props;

	$.head('mqcjbo', $$renderer, ($$renderer) => {
		$$renderer.child_block(async ($$renderer) => {
			if ((await $.save(promise))()) {
				$$renderer.push('<!--[0-->');

				$$renderer.title(($$renderer) => {
					$$renderer.push(`<title>A</title>`);
				});
			} else {
				$$renderer.push('<!--[-1-->');
			}
		});

		$$renderer.push(`<!--]-->`);
	});
}