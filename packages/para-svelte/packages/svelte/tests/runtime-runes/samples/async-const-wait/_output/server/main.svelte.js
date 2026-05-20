import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let { a_promise, b_promise } = $$props;

	$$renderer.push(`<!--[-->`);

	{
		let a;
		var promises = $$renderer.run([async () => a = (await $.save(a_promise))()]);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<!--[-->`);

			{
				let b;
				var promises_1 = $$renderer.run([async () => b = (await $.save(b_promise))()]);

				if (true) {
					$$renderer.push('<!--[0-->');

					let sum;

					var promises_2 = $$renderer.run([
						() => Promise.all([promises[0], promises_1[0]]),
						() => sum = a + b
					]);

					$$renderer.push(`<p>`);
					$$renderer.async([promises_2[1]], ($$renderer) => $$renderer.push(() => $.escape(sum)));
					$$renderer.push(`</p>`);
				} else {
					$$renderer.push('<!--[-1-->');
				}

				$$renderer.push(`<!--]-->`);
			}

			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
}