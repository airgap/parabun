import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.child(async ($$renderer) => {
		const $$0 = (await $.save(true))();

		$$renderer.push(`<div${$.attributes({ ...{} }, void 0, { test: $$0 })}></div>`);
	});

	$$renderer.push(` `);

	$$renderer.child(async ($$renderer) => {
		const $$0 = (await $.save("green"))();

		$$renderer.push(`<div${$.attributes({ ...{} }, void 0, void 0, { color: $$0 })}></div>`);
	});
}