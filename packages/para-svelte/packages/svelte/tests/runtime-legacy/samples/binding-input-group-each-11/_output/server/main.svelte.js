import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let pipelineOperations = $.fallback(
		$$props['pipelineOperations'],
		() => [
			{ operation: { name: "foo", args: [] }, id: 1 },
			{
				operation: {
					name: "bar",
					args: [
						{
							name: "bar_1",
							value: "a",
							options: [{ value: "a" }, { value: "b" }]
						},

						{
							name: "bar_2",
							value: "c",
							options: [{ value: "c" }, { value: "d" }]
						}
					]
				},
				id: 2
			},

			{
				operation: {
					name: "baz",
					args: [
						{
							name: "baz_1",
							value: "b",
							options: [{ value: "a" }, { value: "b" }]
						},

						{
							name: "baz_2",
							value: "c",
							options: [{ value: "c" }, { value: "d" }]
						}
					]
				},
				id: 3
			}
		],
		true
	);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(pipelineOperations);

	for (let $$index_2 = 0, $$length = each_array.length; $$index_2 < $$length; $$index_2++) {
		let { operation, id } = each_array[$$index_2];

		$$renderer.push(`<div>${$.escape(id)} <!--[-->`);

		const each_array_1 = $.ensure_array_like(operation.args);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let arg = each_array_1[$$index_1];

			$$renderer.push(`<div class="arg"><!--[-->`);

			const each_array_2 = $.ensure_array_like(arg.options);

			for (let $$index = 0, $$length = each_array_2.length; $$index < $$length; $$index++) {
				let { value } = each_array_2[$$index];

				$$renderer.push(`<input type="radio"${$.attr('checked', arg.value === value, true)}${$.attr('value', value)}/>`);
			}

			$$renderer.push(`<!--]--></div>`);
		}

		$$renderer.push(`<!--]--></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { pipelineOperations });
}