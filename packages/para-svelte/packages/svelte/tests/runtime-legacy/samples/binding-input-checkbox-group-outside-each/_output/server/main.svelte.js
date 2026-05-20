import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selected = $$props['selected'];
		let values = $$props['values'];

		$$renderer.push(`<label><input type="checkbox"${$.attr('value', values[0])}${$.attr('checked', selected.includes(values[0]), true)}/> ${$.escape(values[0].name)}</label> <label><input type="checkbox"${$.attr('value', values[1])}${$.attr('checked', selected.includes(values[1]), true)}/> ${$.escape(values[1].name)}</label> <label><input type="checkbox"${$.attr('value', values[2])}${$.attr('checked', selected.includes(values[2]), true)}/> ${$.escape(values[2].name)}</label> <p>${$.escape(selected.map(function (value) {
			return value.name;
		}).join(', '))}</p>`);

		$.bind_props($$props, { selected, values });
	});
}