import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let deferred = $$props['deferred'];
		let text = 'same';

		setTimeout(
			() => {
				text = 'same text';
				deferred.resolve();
			},
			5
		);

		$$renderer.push(`<div>${$.escape(text)} text</div>`);
		$.bind_props($$props, { deferred });
	});
}