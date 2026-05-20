import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Two($$anchor, $$props) {
	$.push($$props, false);

	let i = $.prop($$props, 'i', 12);
	let j = $.prop($$props, 'j', 12);
	let value = $.prop($$props, 'value', 28, () => ({ i: i(), j: j() }));

	var $$exports = {
		get i() {
			return i();
		},

		set i($$value) {
			i($$value);
			$.flush();
		},

		get j() {
			return j();
		},

		set j($$value) {
			j($$value);
			$.flush();
		},

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}