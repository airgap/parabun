import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import InnerChild from './InnerChild.svelte';

var root = $.from_html(`<div></div>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let id = $.prop($$props, 'id', 12, 1);
	let count = $.prop($$props, 'count', 12);
	let increment = $.prop($$props, 'increment', 12);
	let list = $.mutable_source();

	$.legacy_pre_effect(() => ($.get(list), $.deep_read_state(count())), () => {
		$.set(list, []);

		for (let i = 0; i < count(); ++i) {
			$.get(list).push(i);
		}
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		},

		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		},

		get increment() {
			return increment();
		},

		set increment($$value) {
			increment($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, () => $.get(list), (item) => item, ($$anchor, item) => {
		InnerChild($$anchor, {
			get val() {
				return $.get(item);
			},

			get increment() {
				return increment();
			}
		});
	});

	$.reset(div);
	$.template_effect(() => $.set_attribute(div, 'data-id', id()));
	$.append($$anchor, div);

	return $.pop($$exports);
}