import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function ssr($$renderer, num) {
	$$renderer.push(`<!---->${$.escape(num)}`);
}

export default function Main($$renderer) {
	let count = 1;

	async function getDouble(count) {
		return count * 2;
	}

	var double;

	var $$promises = $$renderer.run([
		async () => double = await $.async_derived(() => getDouble(count))
	]);

	$$renderer.push(`<!---->Count: `);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(count)));
	$$renderer.push(` Double: `);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		ssr($$renderer, double());
	});
}