import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Select from './select.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 28, () => ['1']);
	let other = $.prop($$props, 'other', 28, () => ({}));

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get other() {
			return other();
		},

		set other($$value) {
			other($$value);
			$.flush();
		}
	};

	Select($$anchor, {
		get value() {
			return value();
		},

		get other() {
			return other();
		}
	});

	return $.pop($$exports);
}