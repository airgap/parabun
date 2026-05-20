import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Select from "./Select.svelte";

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.mutable_source({ a: "1", b: "1" });
	const options = ["1", "2", "3"];
	let label = $.prop($$props, 'label', 12, "test");

	var $$exports = {
		get label() {
			return label();
		},

		set label($$value) {
			label($$value);
			$.flush();
		}
	};

	Select($$anchor, {
		get options() {
			return options;
		},

		get label() {
			return label();
		},

		get value() {
			return $.get(value).a;
		},

		set value($$value) {
			$.mutate(value, $.get(value).a = $$value);
		},
		$$legacy: true
	});

	return $.pop($$exports);
}