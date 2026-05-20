import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let square;
		let num = 2;

		function onClick() {
			this.innerHTML = square;
		}

		$: square = num * num;

		$$renderer.push(`<button>Click me</button>`);
	});
}