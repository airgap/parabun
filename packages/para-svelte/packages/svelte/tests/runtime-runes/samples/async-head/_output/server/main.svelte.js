import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import A from './A.svelte';
import B from './B.svelte';

export default function Main($$renderer) {
	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save(1))();

		A($$renderer, { name: 'a-1', content: $$0 });
	});

	$$renderer.push(` `);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save(2))();

		A($$renderer, { name: 'a-2', content: $$0 });
	});

	$$renderer.push(` `);
	B($$renderer, { name: 'b-1', content: 1 });
	$$renderer.push(`<!----> `);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save(3))();

		A($$renderer, { name: 'a-3', content: $$0 });
	});

	$$renderer.push(` `);
	B($$renderer, { name: 'b-2', content: 2 });
	$$renderer.push(`<!----> `);
	B($$renderer, { name: 'b-3', content: 3 });
	$$renderer.push(`<!---->`);
}