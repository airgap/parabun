import * as $ from 'svelte/internal/server';
import { log } from './log.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let w = 0;
		let h = 0;

		/** @type {HTMLElement} */
		let div;

		$: {
			log.push([!!div, w, h]);
		}

		$$renderer.push(`<div class="box svelte-121lonu"></div>`);
	});
}