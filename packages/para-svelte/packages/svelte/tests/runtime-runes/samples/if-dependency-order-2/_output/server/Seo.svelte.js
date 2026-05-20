import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Seo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { post } = $$props;

		$.head('n5115z', $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${$.escape(post.title)}</title>`);
			});
		});

		$$renderer.push(`<p>${$.escape(post.title)}</p>`);
	});
}