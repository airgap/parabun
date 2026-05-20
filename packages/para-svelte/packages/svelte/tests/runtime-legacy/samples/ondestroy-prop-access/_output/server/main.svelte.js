import * as $ from 'svelte/internal/server';
import Component from "./Component.svelte";

export default function Main($$renderer) {
	let spread;
	let show = true;
	let count = 0;

	$: spread = { checked: show, count };

	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<button></button> <button></button> `);

		if (count < 2) {
			$$renderer.push('<!--[0-->');

			Component($$renderer, {
				get count() {
					return count;
				},

				set count($$value) {
					count = $$value;
					$$settled = false;
				},

				get checked() {
					return show;
				},

				set checked($$value) {
					show = $$value;
					$$settled = false;
				}
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (count < 2) {
			$$renderer.push('<!--[0-->');
			Component($$renderer, $.spread_props([spread]));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (count < 2) {
			$$renderer.push('<!--[0-->');
			Component($$renderer, { count, checked: show });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (show) {
			$$renderer.push('<!--[0-->');
			Component($$renderer, { count, checked: show });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (count < 2 ? Component : undefined) {
			$$renderer.push('<!--[-->');
			(count < 2 ? Component : undefined)($$renderer, { count, checked: show });
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$$renderer.push(` `);

		if (count < 2 ? Component : undefined) {
			$$renderer.push('<!--[-->');
			(count < 2 ? Component : undefined)($$renderer, $.spread_props([spread]));
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$$renderer.push(` `);

		if (show ? Component : undefined) {
			$$renderer.push('<!--[-->');
			(show ? Component : undefined)($$renderer, { count, checked: show });
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$$renderer.push(` `);

		if (show ? Component : undefined) {
			$$renderer.push('<!--[-->');
			(show ? Component : undefined)($$renderer, $.spread_props([spread]));
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
}