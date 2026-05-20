import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	let desks = $.fallback($$props['desks'], () => [{ id: 1, teams: [{ id: 1 }] }], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(desks);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let desk = each_array[$$index_1];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(desk.teams);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let team = each_array_1[$$index];

			Child($$renderer, { id: team.id });
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { desks });
}