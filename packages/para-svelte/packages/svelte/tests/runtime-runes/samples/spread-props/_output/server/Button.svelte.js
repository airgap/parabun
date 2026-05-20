import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Button($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;

	$$renderer.push(`<button${$.attributes({ ...props })}>Hello world</button>`);
}