import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let App;

	$$renderer.push(`<div class="a svelte-xyz"></div> `);

	App($$renderer, {
		$$slots: {
			a: ($$renderer) => {
				$$renderer.push(`<div class="b svelte-xyz" slot="a"></div>`);
			},

			b: ($$renderer) => {
				$$renderer.push(`<div class="c" slot="b"><div class="d svelte-xyz"></div> <div class="e svelte-xyz"></div></div>`);
			},

			c: ($$renderer) => {
				$$renderer.push(`<div class="f svelte-xyz" slot="c"></div>`);
			}
		}
	});

	$$renderer.push(`<!----> <div class="g svelte-xyz"></div>`);
}