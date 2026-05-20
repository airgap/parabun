import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.select({ value: '421' }, ($$renderer) => {
		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(async () => $.escape((await $.save(Promise.resolve(42)))()));
			$$renderer.push(`1`);
		});
	});
}