import * as $ from 'svelte/internal/server';
import Component1 from './Component1.svelte';
import Component2 from './Component2.svelte';

export default function Main($$renderer, $$props) {
	let reset = false;
	let logs = $$props['logs'];

	Component1($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->`);

			{
				Component2($$renderer, { logs });
			}

			$$renderer.push(`<!---->`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!----> <button>Reset!</button>`);
	$.bind_props($$props, { logs });
}