import * as $ from 'svelte/internal/server';
import { beforeUpdate } from 'svelte';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let name = 'rich';
		let allowed = false;

		beforeUpdate(() => {
			// if your name's not dan, you're not coming in
			allowed = name === 'dan';
		});

		$$renderer.push(`<input${$.attr('value', name)}/> `);

		if (allowed) {
			$$renderer.push('<!--[0-->');
			Child($$renderer, { name });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}