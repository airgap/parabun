import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let { b } = $$props;

	$$renderer.push(`<!---->${$.escape(b)}`);
}