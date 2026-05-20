import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let uppercase;
		let array = ['a', 'b', 'c'];

		function onClick() {
			this.innerHTML = uppercase.join(',');
		}

		$: uppercase = array.map((str) => str.toUpperCase());

		$$renderer.push(`<button>Click me</button>`);
	});
}