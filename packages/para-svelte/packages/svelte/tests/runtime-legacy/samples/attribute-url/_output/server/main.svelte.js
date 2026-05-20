import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let bgImage = 'https://example.com/foo.jpg';
	let color = 'red';

	$$renderer.push(`<div${$.attr_style(`background-image: url('${$.stringify(bgImage)}'); color: ${$.stringify(color)};`)}>red</div>`);
}