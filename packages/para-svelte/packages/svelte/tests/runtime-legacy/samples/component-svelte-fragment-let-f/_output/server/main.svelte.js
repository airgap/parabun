import * as $ from 'svelte/internal/server';
import A from './A.svelte';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 1);
	let y = 0;

	A($$renderer, {
		x,
		$$slots: {
			foo: ($$renderer, { reflected }) => {
				{
					$$renderer.push(`<span${$.attr_class($.clsx(reflected))}>${$.escape(reflected)}</span>`);
				}
			}
		}
	});

	$$renderer.push(`<!----> ${$.escape(y)}`);
	$.bind_props($$props, { x });
}