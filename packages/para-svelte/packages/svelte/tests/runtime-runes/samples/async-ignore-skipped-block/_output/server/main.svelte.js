import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let show = true;

		$$renderer.push(`<button>a ${$.escape(a)}</button> <button>b ${$.escape(b)}</button> `);

		if (show) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>hello</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(async () => $.escape(await new Promise(() => {})));
		}

		$$renderer.push(`<!--]-->`);
	});
}