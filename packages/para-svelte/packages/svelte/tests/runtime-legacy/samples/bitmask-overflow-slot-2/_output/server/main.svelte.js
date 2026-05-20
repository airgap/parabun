import * as $ from 'svelte/internal/server';
import Echo from './Echo.svelte';
import { untrack } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let bar;
		let reads = $.fallback($$props['reads'], () => ({}), true);
		let _0 = $.fallback($$props['_0'], '0');
		let _1 = $.fallback($$props['_1'], '1');
		let _2 = $.fallback($$props['_2'], '2');

		const read = (value, label) => {
			untrack(() => {
				if (!reads[label]) reads[label] = 0;

				reads[label] += 1;
			});

			return value;
		};

		$: bar = read(_0, '_0') + ':' + read(_1, '_1');

		Echo($$renderer, {
			d33: _1,
			d32: _2,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { dummy }) => {
					$$renderer.push(`<p>${$.escape(bar)}</p> <p>${$.escape(dummy)}</p> <p>${$.escape(_0)}</p> <p>${$.escape(_1)}</p> <p>${$.escape(_2)}</p>`);
				}
			}
		});

		$.bind_props($$props, { reads, _0, _1, _2 });
	});
}