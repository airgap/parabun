import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer) {
	$$renderer.child(async ($$renderer) => {
		const $$0 = (await $.save({ class: 'cool' }))();

		$$renderer.push(`<p${$.attributes({ ...$$0 })}>cool</p>`);
	});

	$$renderer.push(` `);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save({ thing: 'beans' }))();

		Child($$renderer, $.spread_props([$$0]));
	});

	$$renderer.push(` `);

	$$renderer.child(async ($$renderer) => {
		const $$0 = $.clsx((await $.save('awesome'))());

		$$renderer.push(`<p${$.attr_class($$0)}>awesome</p>`);
	});

	$$renderer.push(` `);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save('sauce'))();

		Child($$renderer, { thing: $$0 });
	});

	$$renderer.push(` `);

	$$renderer.child(async ($$renderer) => {
		const $$0 = $.clsx((await $.save('neato'))());

		$$renderer.push(`<p${$.attributes({ ...{}, class: $$0 })}>neato</p>`);
	});

	$$renderer.push(` `);

	$$renderer.child_block(async ($$renderer) => {
		const $$0 = (await $.save('burrito'))();

		Child($$renderer, $.spread_props([{}, { thing: $$0 }]));
	});
}