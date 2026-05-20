import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.push(`<h1 class="svelte-xyz">Heading 1</h1> <!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		$$renderer.push(`<span class="svelte-xyz">Span 1</span>`);
	});

	$$renderer.push(`<!--]--> <!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		$$renderer.push(`<span class="svelte-xyz">Span 2</span>`);
	});

	$$renderer.push(`<!--]--> <p class="svelte-xyz">Paragraph 2</p>`);
}