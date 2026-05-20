import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<input type="number"/> <ol></ol>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);
	let idToValue = $.prop($$props, 'idToValue', 28, () => Object.create(null));
	let ids = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state(count())), () => {
		$.set(ids, new Array(count()).fill(null).map((_, i) => 'id-' + i));
	});

	$.legacy_pre_effect_reset();

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

	$.each(ol, 5, () => $.get(ids), $.index, ($$anchor, id) => {
		Nested($$anchor, {
			get id() {
				return $.get(id);
			},

			get value() {
				return idToValue()[$.get(id)];
			},

			set value($$value) {
				idToValue(idToValue()[$.get(id)] = $$value, true);
			},

			children: ($$anchor, $$slotProps) => {
				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, `${$.get(id) ?? ''}: value is ${(
					$.deep_read_state(idToValue()),
					$.get(id),
					$.untrack(() => idToValue()[$.get(id)])
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