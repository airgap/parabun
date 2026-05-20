import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<select class="svelte-xyz"><button aria-label="Selected value" class="svelte-xyz"><selectedcontent class="svelte-xyz"></selectedcontent></button>`);

	$$renderer.option(
		{ class: '' },
		($$renderer) => {
			$$renderer.push(`plain text`);
		},
		'svelte-xyz'
	);

	$$renderer.option(
		{ class: '' },
		($$renderer) => {
			$$renderer.push(`<b class="svelte-xyz">rich <i class="svelte-xyz">italic</i></b><e class="svelte-xyz">content</e>`);
		},
		'svelte-xyz',
		void 0,
		void 0,
		void 0,
		true
	);

	$$renderer.push(`<!></select>`);
}