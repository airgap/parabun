import * as $ from 'svelte/internal/server';
import { beforeUpdate } from 'svelte';

export default function Item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count1 = 0;
		let count2 = 0;

		function increaseCount1() {
			count1++;
		}

		beforeUpdate(() => {
			// We don't need to do anything
		});

		$: if (count1 < 10) {
			count2++;
		}

		$: if (count2 < 10) {
			increaseCount1();
		}

		$$renderer.push(`<button>${$.escape(
			// We don't need to do anything
			count1
		)} / ${$.escape(count2)}</button>`);
	});
}