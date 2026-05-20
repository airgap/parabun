import * as $ from 'svelte/internal/server';
import counter from './counter.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];
		let y = $$props['y'];

		function myHelper(value) {
			counter.count += 1;

			return value;
		}

		$$renderer.push(`<p>${$.escape(x)}</p> <p>${$.html(myHelper(y))}</p>`);
		$.bind_props($$props, { x, y });
	});
}