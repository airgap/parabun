import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { getContext, setContext } from 'svelte';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		setContext('key', 'value');

		var $$promises = $$renderer.run([() => Promise.resolve()]);

		$$renderer.push(`<div>${$.escape(getContext('key'))}</div> <div>`);
		$$renderer.push(async () => $.escape((await $.save(Promise.resolve(true)))() && getContext('key')));
		$$renderer.push(`</div> `);
		Child($$renderer, {});
		$$renderer.push(`<!---->`);
	});
}