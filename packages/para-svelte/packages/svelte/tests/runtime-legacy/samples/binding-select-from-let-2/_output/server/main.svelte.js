import * as $ from 'svelte/internal/server';
import Parent from "./Parent.svelte";

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];
	let tasks = $.fallback($$props['tasks'], () => ['do nothing'], true);
	let tasks_touched = $.fallback($$props['tasks_touched'], 0);

	$: {
		(tasks, tasks_touched++);
	}

	Parent($$renderer, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { tasks }) => {
				$$renderer.select({ value: selected }, ($$renderer) => {
					$$renderer.push(`<!--[-->`);

					const each_array = $.ensure_array_like(tasks);

					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let task = each_array[$$index];

						$$renderer.option({ value: task }, ($$renderer) => {
							$$renderer.push(`${$.escape(task)}`);
						});
					}

					$$renderer.push(`<!--]-->`);
				});
			}
		}
	});

	$$renderer.push(`<!----> <p>${$.escape(tasks_touched)}</p>`);
	$.bind_props($$props, { selected, tasks, tasks_touched });
}