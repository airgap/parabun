import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let answer100;
		let answer = 0;

		let promise = $.fallback(
			$$props['promise'],
			() => new Promise((resolve) => {
				setTimeout(
					() => {
						resolve();
						answer = 42;
					},
					0
				);
			}),
			true
		);

		$: answer100 = answer * 100;

		if (promise) {
			$$renderer.push('<!--[0-->');

			$.await(
				$$renderer,
				promise,
				() => {
					$$renderer.push(`<p>wait for it...</p>`);
				},
				(_) => {
					$$renderer.push(`<p>the answer is ${$.escape(answer)}!</p> <p>the answer100 is ${$.escape(answer100)}!</p>`);
				}
			);

			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { promise });
	});
}