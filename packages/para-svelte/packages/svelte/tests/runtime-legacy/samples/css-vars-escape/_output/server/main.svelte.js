import * as $ from 'svelte/internal/server';
import Sub from './Sub.svelte';

export default function Main($$renderer, $$props) {
	let attack = $.fallback($$props['attack'], '" onload="alert(\'uhoh\')" data-nothing="not important');

	$.css_props($$renderer, true, { '--color': attack }, () => {
		Sub($$renderer, {});
	});

	$.bind_props($$props, { attack });
}