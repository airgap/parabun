import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from "./Child.svelte";

export default function Main($$renderer) {
	var b, a;

	var $$promises = $$renderer.run([
		() => 1,
		() => {
			b = true;
			a = true;
		}
	]);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (a) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>`);

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				if (b) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`<p>hello</p>`);
				} else {
					$$renderer.push('<!--[-1-->');
				}
			});

			$$renderer.push(`<!--]--></div> <div>`);

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Child($$renderer, { b });
			});

			$$renderer.push(`</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]-->`);
}