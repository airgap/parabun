import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.push(`<!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		$$renderer.push(`<h1 class="svelte-xyz">Heading 1</h1>`);
	});

	$$renderer.push(`<!--]--> <span>Span 1</span> <span>Span 2</span> <p class="svelte-xyz">Paragraph 2</p>`);
}