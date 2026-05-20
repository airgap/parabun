import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	const { prop } = $$props;

	$$renderer.push(`<!---->${$.escape(prop)}`);
}