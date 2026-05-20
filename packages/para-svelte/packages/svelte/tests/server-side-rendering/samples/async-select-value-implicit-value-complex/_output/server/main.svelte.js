import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

function option($$renderer, val) {
	$$renderer.push(`<!---->`);
	$$renderer.push(async () => $.escape(await val));
}

export default function Main($$renderer) {
	$$renderer.child(async ($$renderer) => {
		const $$0 = (await $.save(Promise.resolve('dog')))();

		$$renderer.select({ value: $$0 }, ($$renderer) => {
			$$renderer.option(
				{},
				($$renderer) => {
					option($$renderer, "--Please choose an option--");
					$$renderer.push(`<!---->`);
				},
				void 0,
				void 0,
				void 0,
				void 0,
				true
			);

			$$renderer.option(
				{},
				($$renderer) => {
					option($$renderer, Promise.resolve('dog'));
					$$renderer.push(`<!---->`);
				},
				void 0,
				void 0,
				void 0,
				void 0,
				true
			);

			$$renderer.option(
				{},
				($$renderer) => {
					option($$renderer, Promise.resolve('cat'));
					$$renderer.push(`<!---->`);
				},
				void 0,
				void 0,
				void 0,
				void 0,
				true
			);
		});
	});
}