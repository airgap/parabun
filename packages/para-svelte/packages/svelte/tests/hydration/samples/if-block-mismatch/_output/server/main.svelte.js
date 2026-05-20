import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let { condition } = $$props;

	if (condition) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>foo</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<p>bar</p>`);
	}

	$$renderer.push(`<!--]-->`);
}