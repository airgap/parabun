import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];
		let id = $$props['id'];

		const initialValues = {
			'id-0': 'zero',
			'id-1': 'one',
			'id-2': 'two',
			'id-3': 'three'
		};

		onMount(() => {
			value = initialValues[id];
		});

		$$renderer.push(`<li><!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]--></li>`);
		$.bind_props($$props, { value, id });
	});
}