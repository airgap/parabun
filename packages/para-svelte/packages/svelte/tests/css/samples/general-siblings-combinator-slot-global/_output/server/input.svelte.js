import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.push(`<div><p class="before svelte-xyz">before</p> <!--[-->`);
	$.slot($$renderer, $$props, 'default', {}, null);
	$$renderer.push(`<!--]--> <p class="foo svelte-xyz"><span class="svelte-xyz">foo</span></p> <p class="bar svelte-xyz">bar</p></div>`);
}