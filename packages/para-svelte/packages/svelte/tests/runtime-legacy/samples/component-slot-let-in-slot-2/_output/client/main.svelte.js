import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

var root_2 = $.from_html(`<button></button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let prop = $.prop($$props, 'prop', 12);
	let log = $.prop($$props, 'log', 12);

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		},

		get log() {
			return log();
		},

		set log($$value) {
			log($$value);
			$.flush();
		}
	};

	$.init();

	Outer($$anchor, {
		get prop() {
			return prop();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const value = $.derived_safe_equal(() => $$slotProps.value);

				Inner($$anchor, {
					children: ($$anchor, $$slotProps) => {
						var button = root_2();

						$.event('click', button, () => {
							log()($.get(value));
						});

						$.append($$anchor, button);
					},
					$$slots: { default: true }
				});
			}
		}
	});

	return $.pop($$exports);
}