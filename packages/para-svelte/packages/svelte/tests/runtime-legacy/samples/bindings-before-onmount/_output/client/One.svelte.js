import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';
import Two from './Two.svelte';

export default function One($$anchor, $$props) {
	$.push($$props, false);

	let snapshot = $.prop($$props, 'snapshot', 12);
	let foo = $.prop($$props, 'foo', 12);

	onMount(() => {
		snapshot(foo()());
	});

	var $$exports = {
		get snapshot() {
			return snapshot();
		},

		set snapshot($$value) {
			snapshot($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.init();

	Two($$anchor, {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
		},
		$$legacy: true
	});

	return $.pop($$exports);
}