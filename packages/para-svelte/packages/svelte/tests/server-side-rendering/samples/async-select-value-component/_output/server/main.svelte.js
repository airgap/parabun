import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Option from './Option.svelte';

export default function Main($$renderer) {
	$$renderer.child(async ($$renderer) => {
		const $$0 = (await $.save(Promise.resolve('dog')))();

		$$renderer.select(
			{ value: $$0 },
			($$renderer) => {
				Option($$renderer, {
					value: '',
					children: ($$renderer) => {
						$$renderer.push(`<!---->--Please choose an option--`);
					},
					$$slots: { default: true }
				});

				$$renderer.push(`<!---->`);

				$$renderer.child_block(async ($$renderer) => {
					const $$0 = (await $.save(Promise.resolve('dog')))();

					Option($$renderer, {
						value: $$0,
						children: ($$renderer) => {
							$$renderer.push(`<!---->Dog`);
						},
						$$slots: { default: true }
					});
				});

				Option($$renderer, {
					value: 'cat',
					children: ($$renderer) => {
						$$renderer.push(`<!---->Cat`);
					},
					$$slots: { default: true }
				});

				$$renderer.push(`<!---->`);
			},
			void 0,
			void 0,
			void 0,
			void 0,
			true
		);
	});
}