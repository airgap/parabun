import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let tags = $.fallback(
			$$props['tags'],
			() => [
				{ name: 'Red', color: '#FF0000' },
				{ name: 'Green', color: '#00FF00' },
				{ name: 'Blue', color: '#0000FF' }
			],
			true
		);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(tags);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let tag = each_array[$$index];
			const tagColor = tags.find((t) => t.name === tag.name).color;

			$$renderer.push(`<p>${$.escape(tagColor)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { tags });
	});
}