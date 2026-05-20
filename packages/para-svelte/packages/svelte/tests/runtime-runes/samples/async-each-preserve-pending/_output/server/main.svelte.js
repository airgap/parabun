import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let values = [1];
	const queue = [];

	function push(v) {
		if (v === 1) return v;

		const p = Promise.withResolvers();

		queue.push(() => p.resolve(v));

		return p.promise;
	}

	function shift() {
		const fn = queue.shift();

		if (fn) fn();
	}

	function addValue() {
		values = [...values, values.length + 1];
	}

	$$renderer.push(`<button>add</button> <button>shift</button> <!--[-->`);

	const each_array = $.ensure_array_like(values);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let v = each_array[$$index];

		$$renderer.push(`<p>`);
		$$renderer.push(async () => $.escape((await $.save(push(v)))()));
		$$renderer.push(`</p>`);
	}

	$$renderer.push(`<!--]-->`);
}