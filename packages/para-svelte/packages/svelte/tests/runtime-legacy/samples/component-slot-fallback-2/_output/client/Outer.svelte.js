import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from "./Inner.svelte";

export default function Outer($$anchor, $$props) {
	$.push($$props, false);

	let defaultValue = $.prop($$props, 'defaultValue', 12, '');
	let slotProps = $.prop($$props, 'slotProps', 12, '');

	var $$exports = {
		get defaultValue() {
			return defaultValue();
		},

		set defaultValue($$value) {
			defaultValue($$value);
			$.flush();
		},

		get slotProps() {
			return slotProps();
		},

		set slotProps($$value) {
			slotProps($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(
		node,
		$$props,
		'default',
		{
			get slotProps() {
				return slotProps();
			}
		},
		($$anchor) => {
			Inner($$anchor, {
				get value() {
					return defaultValue();
				}
			});
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}