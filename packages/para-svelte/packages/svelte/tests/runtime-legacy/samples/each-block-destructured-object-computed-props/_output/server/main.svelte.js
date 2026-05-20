import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let objectsArray = $$props['objectsArray'];
		let firstString = $$props['firstString'];
		let secondString = $$props['secondString'];

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(objectsArray);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let {
				[firstString]: firstProp,
				[secondString]: secondProp,
				[firstString.split('').reverse().join('')]: reverseFirst,
				[secondString.toUpperCase()]: upperSecond
			} = each_array[$$index];

			$$renderer.push(`<p>${$.escape(firstString)}: ${$.escape(firstProp)}</p> <p>${$.escape(secondString)}: ${$.escape(secondProp)}</p> <p>${$.escape(firstString.split('').reverse().join(''))}: ${$.escape(reverseFirst)}</p> <p>${$.escape(secondString.toUpperCase())}: ${$.escape(upperSecond)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { objectsArray, firstString, secondString });
	});
}