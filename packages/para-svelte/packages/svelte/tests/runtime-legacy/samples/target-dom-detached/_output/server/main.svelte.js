import * as $ from 'svelte/internal/server';
import App from './App.svelte';
import { onMount, mount, unmount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let div = $$props['div'];

		onMount(() => {
			div = document.createElement('div');

			const app = mount(App, { target: div });

			return () => {
				unmount(app);
			};
		});

		$.bind_props($$props, { div });
	});
}