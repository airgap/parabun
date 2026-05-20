import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.child_block(async ($$renderer) => {
		if ((await $.save(false))()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p id="if-branch">if branch</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<p id="else-branch">`);
			$$renderer.push(async () => $.escape((await $.save('else branch'))()));
			$$renderer.push(`</p>`);
		}
	});

	$$renderer.push(`<!--]-->`);
}