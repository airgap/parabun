import * as $ from 'svelte/internal/server';
import { onMount, afterUpdate } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let hue = 0;
		let show_hue = false;
		let canvas;
		let ctx;

		onMount(() => {
			ctx = canvas.getContext('2d');
		});

		afterUpdate(() => {
			if (canvas !== null) {
				ctx.fillStyle = `hsl(${hue}, 100%, 40%)`;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			}
		});

		$$renderer.push(`<canvas class="svelte-70s021"></canvas> <div class="info svelte-70s021"><p>click the canvas</p> <label><input type="checkbox"${$.attr('checked', show_hue, true)}/> show hue</label> `);

		if (show_hue) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>hue is ${$.escape(hue)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--></div>`);
	});
}