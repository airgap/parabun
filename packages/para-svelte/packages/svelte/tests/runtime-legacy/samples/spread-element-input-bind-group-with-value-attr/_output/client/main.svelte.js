import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let props = $.prop($$props, 'props', 12);
	let radioValue = $.mutable_source();

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var input = root();

	$.attribute_effect(input, () => ({ type: 'radio', value: 'abc', ...props() }), void 0, void 0, void 0, void 0, true);
	$.bind_group(binding_group, [], input, () => $.get(radioValue), ($$value) => $.set(radioValue, $$value));
	$.append($$anchor, input);

	return $.pop($$exports);
}