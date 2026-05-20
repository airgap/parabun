import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { get } from "./main.svelte";

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { error } = $$props;
		const context = get();

		if (error) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>caught: `);
			$$renderer.push(async () => $.escape((await $.save(error))()));
			$$renderer.push(` (${$.escape(context)})</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(async () => $.escape(await Promise.reject('catch me')));
		}

		$$renderer.push(`<!--]-->`);
	});
}