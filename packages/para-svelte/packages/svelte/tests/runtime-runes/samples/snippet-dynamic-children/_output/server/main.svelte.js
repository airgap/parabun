import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Button from "./Button.svelte";

export default function Main($$renderer) {
	let show = false;

	Button($$renderer, {
		change: () => show = true,
		children: ($$renderer) => {
			if (show) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<span>showing</span>`);
			} else {
				$$renderer.push('<!--[-1-->');
				$$renderer.push(`<span>hidden</span>`);
			}

			$$renderer.push(`<!--]-->`);
		},
		$$slots: { default: true }
	});
}