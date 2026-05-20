import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let { value } = $$props;

	$$renderer.push(`<!---->${$.escape(value)}`);
}