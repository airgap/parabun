import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<x class="svelte-xyz"><y class="svelte-xyz"><z class="svelte-xyz"></z> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<d class="svelte-xyz"></d> <e class="svelte-xyz"></e> <f class="svelte-xyz"></f>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></y></x> <c class="svelte-xyz"></c> <g class="svelte-xyz"><h class="svelte-xyz"><i class="svelte-xyz"></i></h></g> <j class="svelte-xyz"><k class="svelte-xyz"></k></j>`);
}