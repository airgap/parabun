import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var condition;
	var $$promises = $$renderer.run([() => 0, async () => condition = await true]);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (condition) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>yep</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<p>nope</p>`);
		}
	});

	$$renderer.push(`<!--]-->`);
}