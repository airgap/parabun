import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Input($$renderer) {
	$$renderer.push(`<div><x class="svelte-xyz"></x> `);

	{
		function foo($$renderer) {
			$$renderer.push(`<v class="svelte-xyz"></v>`);
		}

		Child($$renderer, {
			foo,
			children: ($$renderer) => {
				$$renderer.push(`<y class="svelte-xyz"></y>`);
			},
			$$slots: { foo: true, default: true }
		});
	}

	$$renderer.push(`<!----> <z class="svelte-xyz"></z> `);

	{
		function foo($$renderer) {
			$$renderer.push(`<span><n></n></span>`);
		}

		Child($$renderer, {
			foo,
			children: ($$renderer) => {
				$$renderer.push(`<span><n></n></span>`);
			},
			$$slots: { foo: true, default: true }
		});
	}

	$$renderer.push(`<!----> <m></m></div>`);
}