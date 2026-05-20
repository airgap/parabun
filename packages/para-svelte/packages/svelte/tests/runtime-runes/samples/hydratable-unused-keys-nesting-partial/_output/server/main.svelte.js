import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { environment } = $$props;

		const partially_used_hydratable = hydratable("partially_used", () => {
			return {
				used: new Promise((res, rej) => environment === 'server'
					? setTimeout(() => res('did you ever hear the tragedy of darth plagueis the wise?'), 0)
					: rej('should not run')),

				unused: new Promise((res, rej) => environment === 'server'
					? setTimeout(() => res('no, sith daddy, please tell me'), 0)
					: rej('should not run'))
			};
		});

		$$renderer.push(`<div>`);
		$$renderer.push(async () => $.escape((await $.save(partially_used_hydratable.used))()));
		$$renderer.push(`</div> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<div>Loading...</div>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}