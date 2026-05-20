import * as $ from 'svelte/internal/server';
import { tick } from 'svelte';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let promise;
		let resolve;
		let value = 0;
		let logs = $.fallback($$props['logs'], () => [], true);

		async function new_promise() {
			promise = new Promise((r) => {
				resolve = r;
			});
		}

		async function resolve_promise() {
			await Promise.resolve();
			resolve(value++);
		}

		async function test() {
			resolve_promise();
			await tick();
			new_promise();
			resolve_promise();

			return tick();
		}

		new_promise();

		$.await(
			$$renderer,
			promise,
			() => {
				$$renderer.push(`Loading...`);
			},
			(state) => {
				Component($$renderer, { state, logs });
			}
		);

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { logs, test });
	});
}