import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Input($$renderer) {
	Child($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<div class="a svelte-xyz">a</div> <div class="c svelte-xyz">c</div>`);
		},

		$$slots: {
			default: true,
			wut: ($$renderer) => {
				$$renderer.push(`<div class="b" slot="wut">b</div>`);
			}
		}
	});
}