import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let show = false;
		let show_async = false;
		let count = 0;

		$$renderer.push(`<button>show</button> `);

		if (show) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`hi`);
		} else {
			$$renderer.push('<!--[-1-->');

			if (show || !show) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<button>${$.escape(count)}</button>`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--> `);

		if (show_async) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await new Promise(() => {})));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}