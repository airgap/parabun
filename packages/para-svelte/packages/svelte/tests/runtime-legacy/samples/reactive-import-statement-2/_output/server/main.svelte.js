import * as $ from 'svelte/internal/server';
import { obj } from './data.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let prop;

		obj.foo = 'a different prop';

		$: prop = obj.prop;

		$$renderer.push(`<p>${$.escape(prop)}</p>`);
	});
}