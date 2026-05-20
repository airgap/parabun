import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let primitive_updates = $.prop($$props, 'primitive_updates', 12, 0);
	let object_updates = $.prop($$props, 'object_updates', 12, 0);
	const obj = $.mutable_source({ foo: '' });
	let foo = $.mutable_source('bar');

	$effect: if ($.get(obj)) $.update_prop(object_updates);
	$effect: if ($.get(foo)) $.update_prop(primitive_updates);

	var $$exports = {
		get primitive_updates() {
			return primitive_updates();
		},

		set primitive_updates($$value) {
			primitive_updates($$value);
			$.flush();
		},

		get object_updates() {
			return object_updates();
		},

		set object_updates($$value) {
			object_updates($$value);
			$.flush();
		}
	};

	Component($$anchor, {
		get value() {
			return $.get(obj).foo;
		},

		set value($$value) {
			$.mutate(obj, $.get(obj).foo = $$value);
		},

		get value2() {
			return $.get(foo);
		},

		set value2($$value) {
			$.set(foo, $$value);
		},
		$$legacy: true
	});

	return $.pop($$exports);
}