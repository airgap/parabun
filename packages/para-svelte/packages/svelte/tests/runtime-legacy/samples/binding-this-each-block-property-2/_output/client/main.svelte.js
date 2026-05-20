import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { tick } from 'svelte';

var root_1 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let refs = $.mutable_source([]);

	function addItem() {
		$.set(refs, $.get(refs).concat({ ref: null }));

		return tick();
	}

	let callback = $.prop($$props, 'callback', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(callback()), $.get(refs)), () => {
		callback()($.get(refs));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		addItem,
		get callback() {
			return callback();
		},

		set callback($$value) {
			callback($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(refs), $.index, ($$anchor, xxx, $$index) => {
		var div = root_1();

		$.bind_this(
			div,
			($$value, xxx) => (
				xxx.ref = $$value,
				$.invalidate_inner_signals(() => ($.get(refs)))
			),
			(xxx) => xxx?.ref,
			() => [$.get(xxx)]
		);

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'addItem', addItem);

	return $.pop($$exports);
}