import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];
	let tag = $$props['tag'];

	function flip(node, animation, params) {
		const dx = animation.from.left - animation.to.left;
		const dy = animation.from.top - animation.to.top;

		return {
			duration: 100,
			css: (t, u) => `transform: translate(${u * dx}px, ${u * dy}px)`
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		$.element($$renderer, tag, void 0, () => {
			$$renderer.push(`${$.escape(thing.name)}`);
		});
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things, tag });
}