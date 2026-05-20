import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Input($$renderer) {
	$$renderer.push(`<x class="svelte-xyz"></x> `);

	{
		function foo($$renderer) {
			$$renderer.push(`<y class="svelte-xyz">this should be green</y>`);
		}

		Child($$renderer, { foo, $$slots: { foo: true } });
	}

	$$renderer.push(`<!---->`);
}