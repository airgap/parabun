import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Component($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let logs = $$props['logs'];
		let state = $$props['state'];

		onMount(() => {
			logs.push(`mount ${state}`);

			return () => {
				logs.push(`unmount ${state}`);
			};
		});

		$$renderer.push(`<!---->${$.escape(state)}`);
		$.bind_props($$props, { logs, state });
	});
}