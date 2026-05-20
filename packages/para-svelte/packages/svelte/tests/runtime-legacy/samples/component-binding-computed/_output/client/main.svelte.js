import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let fields = $.prop($$props, 'fields', 28, () => ['firstname', 'lastname']);
	let values = $.prop($$props, 'values', 28, () => ({ firstname: '', lastname: '' }));

	var $$exports = {
		get fields() {
			return fields();
		},

		set fields($$value) {
			fields($$value);
			$.flush();
		},

		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, fields, $.index, ($$anchor, field) => {
		Nested($$anchor, {
			get field() {
				return $.get(field);
			},

			get value() {
				return values()[$.get(field)];
			},

			set value($$value) {
				values(values()[$.get(field)] = $$value, true);
			},
			$$legacy: true
		});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}