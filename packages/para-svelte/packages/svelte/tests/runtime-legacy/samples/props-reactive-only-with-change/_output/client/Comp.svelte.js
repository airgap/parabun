import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Comp($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	let id = $.prop($$props, 'id', 12);
	let callback = $.prop($$props, 'callback', 12);

	$.legacy_pre_effect(
		() => (
			$.deep_read_state($$sanitized_props),
			$.deep_read_state(callback()),
			$.deep_read_state(id())
		),
		() => {
			($$sanitized_props, callback()(id()));
		}
	);

	$.legacy_pre_effect_reset();

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		},

		get callback() {
			return callback();
		},

		set callback($$value) {
			callback($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}