import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<div><span${$.attr_class(`a/${$.stringify(42)}`)}></span></div>`);
}