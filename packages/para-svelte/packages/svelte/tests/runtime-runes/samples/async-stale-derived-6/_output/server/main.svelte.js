import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const queue1 = [];
		const queue2 = [];
		let a = 0;
		let b = 0;
		let c = 0;
		let d = 0;

		function push(value, where = 1) {
			if (!value) return value;

			return new Promise((r) => (where === 1 ? queue1 : queue2).push(() => r(value)));
		}

		$$renderer.push(`<button>a / c</button> <button>b / d</button> <button>pop 1</button> <button>shift 2</button> <p>${$.escape(a)} + ${$.escape(b)} = `);
		$$renderer.push(async () => $.escape((await $.save(push(a + b)))()));
		$$renderer.push(` | `);
		$$renderer.push(async () => $.escape((await $.save(push(c, 2)))()));
		$$renderer.push(` `);
		$$renderer.push(async () => $.escape((await $.save(push(d, 2)))()));
		$$renderer.push(`</p>`);
	});
}