import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let count1 = 0;
	let count2 = 0;

	function increaseCount1() {
		count1++;
	}

	$: if (count1 < 10) {
		console.log(2);
		count2++;
	}

	$: if (count2 < 10) {
		console.log(1);
		increaseCount1();
	}

	$$renderer.push(`<button>${$.escape(count1)} / ${$.escape(count2)}</button>`);
}