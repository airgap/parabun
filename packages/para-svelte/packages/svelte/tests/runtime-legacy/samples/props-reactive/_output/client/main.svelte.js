import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);
	let c = $.prop($$props, 'c', 12);
	let d = $.prop($$props, 'd', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		},

		get d() {
			return d();
		},

		set d($$value) {
			d($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get foo() {
			return a();
		},

		get bar() {
			return b();
		},

		get baz() {
			return c();
		},

		get qux() {
			return d();
		}
	});

	return $.pop($$exports);
}