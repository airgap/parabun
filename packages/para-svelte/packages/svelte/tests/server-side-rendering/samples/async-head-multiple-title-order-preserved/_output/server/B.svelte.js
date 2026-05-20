import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function B($$renderer, $$props) {
	let { promise } = $$props;

	$.head('88jot3', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>`);
			$$renderer.push(async () => $.escape((await $.save(promise))() && 'B'));
			$$renderer.push(`</title>`);
		});
	});
}