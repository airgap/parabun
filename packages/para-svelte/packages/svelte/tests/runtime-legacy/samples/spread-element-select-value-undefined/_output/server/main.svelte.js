import * as $ from 'svelte/internal/server';
import Select from "./Select.svelte";

export default function Main($$renderer, $$props) {
	let value = { a: "1", b: "1" };
	const options = ["1", "2", "3"];
	let label = $.fallback($$props['label'], "test");
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Select($$renderer, {
			options,
			label,
			get value() {
				return value.a;
			},

			set value($$value) {
				value.a = $$value;
				$$settled = false;
			}
		});
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { label });
}