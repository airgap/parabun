import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from "./Outer.svelte";

var root_1 = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let log = $.prop($$props, 'log', 28, () => []);
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

	Outer($$anchor, {
		get log() {
			return log();
		},

		get a() {
			return a();
		},

		get b() {
			return b();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const outerCall = $.derived_safe_equal(() => $$slotProps.outerCall);
				var button = root_1();

				$.event('click', button, function (...$$args) {
					$.get(outerCall)?.apply(this, $$args);
				});

				$.append($$anchor, button);
			}
		}
	});

	return $.pop($$exports);
}