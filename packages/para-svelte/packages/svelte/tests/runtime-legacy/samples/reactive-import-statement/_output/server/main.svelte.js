import * as $ from 'svelte/internal/server';
import { numbers } from './data.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let sum, local_sum;
		const local_numbers = [1, 2, 3, 4];

		function addNumber() {
			numbers[numbers.length] = numbers.length + 1;
			local_numbers[local_numbers.length] = local_numbers.length + 1;
		}

		$: sum = numbers.reduce((t, n) => t + n, 0);
		$: local_sum = local_numbers.reduce((t, n) => t + n, 0);

		$$renderer.push(`<!---->import <p>${$.escape(numbers.join(' + '))} = ${$.escape(sum)}</p> local <p>${$.escape(local_numbers.join(' + '))} = ${$.escape(local_sum)}</p> <button>Add a number</button>`);
	});
}