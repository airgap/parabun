import * as $ from 'svelte/internal/server';
import Echo from './Echo.svelte';

export default function Main($$renderer, $$props) {
	let _0 = $.fallback($$props['_0'], 0);
	let _40 = $$props['_40'];

	Echo($$renderer, {
		_40,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { dummy }) => {
				$$renderer.push(`<p>${$.escape(_0)}</p> <p>${$.escape(dummy)}</p>`);
			}
		}
	});

	$.bind_props($$props, { _0, _40 });
}