import * as $ from 'svelte/internal/server';
import { onMount } from "svelte";

export default function Component2($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let logs = $$props['logs'];

		onMount(() => {
			logs.push("mount");

			return () => {
				logs.push("unmount");
			};
		});

		$.bind_props($$props, { logs });
	});
}