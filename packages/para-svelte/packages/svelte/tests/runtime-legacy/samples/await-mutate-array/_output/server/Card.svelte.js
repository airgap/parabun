import * as $ from 'svelte/internal/server';

export default function Card($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let card = $$props['card'];
		let onfav = $$props['onfav'];

		$$renderer.push(`<button>${$.escape(card.x)}</button>`);
		$.bind_props($$props, { card, onfav });
	});
}