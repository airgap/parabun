import * as $ from 'svelte/internal/server';
import Sub from './Sub.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let componentName = $.fallback($$props['componentName'], 'Sub');
		let proxy = new Proxy(Sub, {});
		let banana = {};
		let component;

		$: {
			if (componentName === 'Sub') component = Sub; else if (componentName === 'Proxy') component = proxy; else component = banana;
		}

		if (component) {
			$$renderer.push('<!--[-->');
			component($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$.bind_props($$props, { componentName });
	});
}