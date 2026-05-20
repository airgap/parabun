import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let values = [1];
		const queue = [];

		function push(v) {
			if (v === 1) return v;

			const p = Promise.withResolvers();

			queue.push(() => p.resolve(v));

			return p.promise;
		}

		function addValue() {
			values.push(values.length + 1);
		}

		$$renderer.push(`<button>add</button> <button>shift</button> <button>pop</button> <p>pending=${$.escape(0)}
	values.length=${$.escape(values.length)}
	values=[${$.escape(values)}]</p> <div>not keyed: <!--[-->`);

		const each_array = $.ensure_array_like(values);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let v = each_array[$$index];

			$$renderer.push(`<div>`);
			$$renderer.push(async () => $.escape((await $.save(push(v)))()));
			$$renderer.push(`</div>`);
		}

		$$renderer.push(`<!--]--></div> <div>keyed: <!--[-->`);

		const each_array_1 = $.ensure_array_like(values);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let v = each_array_1[$$index_1];

			$$renderer.push(`<div>`);
			$$renderer.push(async () => $.escape((await $.save(push(v)))()));
			$$renderer.push(`</div>`);
		}

		$$renderer.push(`<!--]--></div>`);
	});
}