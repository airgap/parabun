import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<input type="number"/> <ol></ol>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);
	let idToValue = $.prop($$props, 'idToValue', 28, () => Object.create(null));

	function ids(count) {
		return new Array(count).fill(null).map((_, i) => ({ id: 'id-' + i })).reverse();
	}

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		},

		get idToValue() {
			return idToValue();
		},

		set idToValue($$value) {
			idToValue($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var ol = $.sibling(input, 2);

	$.each(ol, 5, () => ($.deep_read_state(count()), $.untrack(() => ids(count()))), (object) => object.id, ($$anchor, object) => {
		Nested($$anchor, {
			get id() {
				return ($.get(object), $.untrack(() => $.get(object).id));
			},

			get value() {
				return idToValue()[$.get(object).id];
			},

			set value($$value) {
				idToValue(idToValue()[$.get(object).id] = $$value, true);
			},

			children: ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, `${($.get(object), $.untrack(() => $.get(object).id)) ?? ''}: value is ${(
					$.deep_read_state(idToValue()),
					$.get(object),
					$.untrack(() => idToValue()[$.get(object).id])
				) ?? ''}`));

				$.append($$anchor, text);
			},
			$$slots: { default: true },
			$$legacy: true
		});
	});

	$.reset(ol);
	$.bind_value(input, count);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}