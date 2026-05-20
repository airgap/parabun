import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { omit } from './utils.js';

var root = $.from_html(`<input/>`);

export default function InputOne($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	const props = $.mutable_source();
	let value = $.prop($$props, 'value', 12);

	function onInput(e) {
		value(e.target.value);
	}

	$.legacy_pre_effect(() => (omit, $.deep_read_state($$sanitized_props)), () => {
		$.set(props, omit($$sanitized_props, 'value'));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var input = root();

	$.attribute_effect(input, () => ({ type: 'text', ...$.get(props), value: value() }), void 0, void 0, void 0, void 0, true);
	$.event('input', input, onInput);
	$.append($$anchor, input);

	return $.pop($$exports);
}