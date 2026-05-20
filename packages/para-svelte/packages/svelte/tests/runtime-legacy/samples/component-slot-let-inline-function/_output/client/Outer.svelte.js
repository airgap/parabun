import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from './Inner.svelte';

export default function Outer($$anchor, $$props) {
	$.push($$props, false);

	let log = $.prop($$props, 'log', 12);
	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);

	var $$exports = {
		get log() {
			return log();
		},

		set log($$value) {
			log($$value);
			$.flush();
		},

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
		}
	};

	Inner($$anchor, {
		get log() {
			return log();
		},

		get b() {
			return b();
		},

		$$slots: {
			inner_slot: ($$anchor, $$slotProps) => {
				const innerCall = $.derived_safe_equal(() => $$slotProps.innerCall);
				var fragment_1 = $.comment();
				var node = $.first_child(fragment_1);

				$.slot(node, $$props, 'default', { outerCall: () => $.get(innerCall)(a()) }, null);
				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}