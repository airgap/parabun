import * as $ from 'svelte/internal/server';
import { tick } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let snapshots = $.fallback($$props['snapshots'], () => [], true);
		let count = 0;
		let buttons = [];

		function increment() {
			count += 1;
			log();
		}

		function log() {
			snapshots.push(`before ${buttons[0].textContent}`);

			tick().then(() => {
				snapshots.push(`after ${buttons[0].textContent}`);
			});
		}

		$$renderer.push(`<button>${$.escape(count)}</button> <button>${$.escape(count)}</button>`);
		$.bind_props($$props, { snapshots });
	});
}