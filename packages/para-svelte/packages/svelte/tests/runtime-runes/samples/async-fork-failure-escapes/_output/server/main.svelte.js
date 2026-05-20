import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let show = false;
		let f;

		function failed($$renderer) {
			$$renderer.push(`<!---->failed`);
		}

		$$renderer.push(`<button>show</button> <button>commit</button> <button>discard</button> `);

		$$renderer.boundary({ failed }, ($$renderer) => {
			$$renderer.push(`<!--[-->`);

			{
				if (show) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(async () => $.escape(await Promise.reject('boom')));
				} else {
					$$renderer.push('<!--[-1-->');
				}

				$$renderer.push(`<!--]-->`);
			}

			$$renderer.push(`<!--]-->`);
		});
	});
}