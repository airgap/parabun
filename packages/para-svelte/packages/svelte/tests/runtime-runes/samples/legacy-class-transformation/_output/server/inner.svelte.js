import 'svelte/internal/flags/async';
import { render as $$_render } from 'svelte/server';
import * as $ from 'svelte/internal/server';

function Inner($$renderer, $$props) {
	let { num } = $$props;

	$$renderer.push(`<p>${$.escape(num)}</p>`);
}

Inner.render = function ($$props, $$opts) {
	return $$_render(Inner, { props: $$props, context: $$opts?.context });
};

export default Inner;