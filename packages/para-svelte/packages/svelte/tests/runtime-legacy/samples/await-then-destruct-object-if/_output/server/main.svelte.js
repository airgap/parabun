import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let thePromise = $$props['thePromise'];
	let count = 0;

	setTimeout(
		() => {
			count++;
		},
		0
	);

	$.await($$renderer, thePromise, () => {}, ({ result }) => {
		if (result) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>result: ${$.escape(result)}</p> <p>count: ${$.escape(count)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<p>result: ${$.escape(result)}</p> <p>count: ${$.escape(count)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { thePromise });
}