import 'svelte/internal/flags/async';
import { render as $$_render } from 'svelte/server';
import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';
import Inner from './inner.svelte';

function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let target;

		onMount(() => {
			new Inner({ target, props: { num: 1 } });
		});

		$$renderer.push(`<div></div>`);
	});
}

Main.render = function ($$props, $$opts) {
	return $$_render(Main, { props: $$props, context: $$opts?.context });
};

export default Main;