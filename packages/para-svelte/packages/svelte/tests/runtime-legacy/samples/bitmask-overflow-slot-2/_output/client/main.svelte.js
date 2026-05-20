import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Echo from './Echo.svelte';
import { untrack } from "svelte";

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const bar = $.mutable_source();
	let reads = $.prop($$props, 'reads', 28, () => ({}));
	let _0 = $.prop($$props, '_0', 12, '0');
	let _1 = $.prop($$props, '_1', 12, '1');
	let _2 = $.prop($$props, '_2', 12, '2');

	const read = (value, label) => {
		untrack(() => {
			if (!reads()[label]) reads(reads()[label] = 0, true);

			reads(reads()[label] += 1, true);
		});

		return value;
	};

	$.legacy_pre_effect(() => ($.deep_read_state(_0()), $.deep_read_state(_1())), () => {
		$.set(bar, read(_0(), '_0') + ':' + read(_1(), '_1'));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get reads() {
			return reads();
		},

		set reads($$value) {
			reads($$value);
			$.flush();
		},

		get _0() {
			return _0();
		},

		set _0($$value) {
			_0($$value);
			$.flush();
		},

		get _1() {
			return _1();
		},

		set _1($$value) {
			_1($$value);
			$.flush();
		},

		get _2() {
			return _2();
		},

		set _2($$value) {
			_2($$value);
			$.flush();
		}
	};

	$.init();

	Echo($$anchor, {
		get d33() {
			return _1();
		},

		get d32() {
			return _2();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const dummy = $.derived_safe_equal(() => $$slotProps.dummy);
				var fragment_1 = root_1();
				var p = $.first_child(fragment_1);
				var text = $.child(p, true);

				$.reset(p);

				var p_1 = $.sibling(p, 2);
				var text_1 = $.child(p_1, true);

				$.reset(p_1);

				var p_2 = $.sibling(p_1, 2);
				var text_2 = $.child(p_2, true);

				$.reset(p_2);

				var p_3 = $.sibling(p_2, 2);
				var text_3 = $.child(p_3, true);

				$.reset(p_3);

				var p_4 = $.sibling(p_3, 2);
				var text_4 = $.child(p_4, true);

				$.reset(p_4);

				$.template_effect(() => {
					$.set_text(text, $.get(bar));
					$.set_text(text_1, $.get(dummy));
					$.set_text(text_2, _0());
					$.set_text(text_3, _1());
					$.set_text(text_4, _2());
				});

				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}