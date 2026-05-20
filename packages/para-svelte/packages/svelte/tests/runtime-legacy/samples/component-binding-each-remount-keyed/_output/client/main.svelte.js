import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';
import Child from './Child.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let updateCounter = 0;
	let promiseResolve;

	const done = new Promise((resolve) => {
		promiseResolve = resolve;
	});

	const getCounter = () => {
		return updateCounter;
	};

	let vals = $.mutable_source([1, 2, 3]);
	const instances = $.mutable_source([]);
	let count = $.mutable_source(3);

	const increment = () => {
		++updateCounter;
	};

	onMount(() => {
		$.set(count, 2);

		setTimeout(() => {
			$.set(vals, $.get(vals).reverse());
			setTimeout(promiseResolve);
		});
	});

	var $$exports = { done, getCounter };

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 3, () => $.get(vals), (val) => val, ($$anchor, val, index) => {
		$.bind_this(
			Child($$anchor, {
				get id() {
					return $.get(val);
				},

				get count() {
					return $.get(count);
				},
				increment,
				$$legacy: true
			}),
			($$value, index) => $.mutate(instances, $.get(instances)[index] = $$value),
			(index) => $.get(instances)?.[index],
			() => [$.get(index)]
		);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'done', done);
	$.bind_prop($$props, 'getCounter', getCounter);

	return $.pop($$exports);
}