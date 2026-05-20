import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	if (visible) {
		$$renderer.push('<!--[0-->');

		Child($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->delayed`);
			},
			$$slots: { default: true }
		});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}