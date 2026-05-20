import * as $ from 'svelte/internal/server';
import App from './App.svelte';
import { onMount, mount, unmount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let div = $$props['div'];

		onMount(() => {
			const root = div.attachShadow({ mode: 'open' });
			const app = mount(App, { target: root });

			return () => {
				unmount(app);
			};
		});

		$$renderer.push(`<div></div>`);
		$.bind_props($$props, { div });
	});
}