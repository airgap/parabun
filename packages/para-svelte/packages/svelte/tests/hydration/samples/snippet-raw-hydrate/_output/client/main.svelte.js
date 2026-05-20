import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createRawSnippet } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const snippet = createRawSnippet(() => ({
		render: () => `
			<p>rendered</p>
		`,

		setup(p) {
			p.textContent = 'hydrated';
		}
	}));

	$.init();
	snippet($$anchor);
	$.pop();
}