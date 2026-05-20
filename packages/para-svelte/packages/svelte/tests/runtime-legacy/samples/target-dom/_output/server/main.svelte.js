import * as $ from 'svelte/internal/server';
import App from './App.svelte';
import { onMount, mount, unmount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let div = $$props['div'];

		onMount(() => {
			const app = mount(App, { target: div });

			return () => {
				unmount(app);
			};
		});

		$$renderer.push(`<div></div>`);
		$.bind_props($$props, { div });
	});
}