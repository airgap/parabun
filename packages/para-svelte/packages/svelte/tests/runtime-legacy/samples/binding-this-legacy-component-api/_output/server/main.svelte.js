import { render as $$_render } from 'svelte/server';
import * as $ from 'svelte/internal/server';
import Sub from './sub.svelte';
import { onMount } from 'svelte';

function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let component;

		onMount(() => {
			component.$on('increment', (e) => {
				count += e.detail;
				component.$set({ count });
			});
		});

		Sub($$renderer, {});
	});
}

Main.render = function ($$props, $$opts) {
	return $$_render(Main, { props: $$props, context: $$opts?.context });
};

export default Main;