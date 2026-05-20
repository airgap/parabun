import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];
	let answer = $$props['answer'];

	if (promise) {
		$$renderer.push('<!--[0-->');

		$.await(
			$$renderer,
			promise,
			() => {
				$$renderer.push(`<p>wait for it...</p>`);
			},
			(_) => {
				$$renderer.push(`<p>the answer is ${$.escape(answer)}!</p>`);
			}
		);

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise, answer });
}