import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { tick } from 'svelte';
import Component from './Component.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.mutable_source();
	let resolve;
	let value = 0;
	let logs = $.prop($$props, 'logs', 28, () => []);

	async function new_promise() {
		$.set(promise, new Promise((r) => {
			resolve = r;
		}));
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

	var $$exports = {
		test,
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		() => $.get(promise),
		($$anchor) => {
			var text = $.text('Loading...');

			$.append($$anchor, text);
		},
		($$anchor, state) => {
			Component($$anchor, {
				get state() {
					return $.get(state);
				},

				get logs() {
					return logs();
				}
			});
		}
	);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'test', test);

	return $.pop($$exports);
}