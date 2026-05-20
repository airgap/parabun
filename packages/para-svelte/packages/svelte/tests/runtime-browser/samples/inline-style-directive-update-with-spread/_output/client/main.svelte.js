import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function _unknown_($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, ['backgroundColor']);

	$.push($$props, false);

	let backgroundColor = $.prop($$props, 'backgroundColor', 12, 255);

	var $$exports = {
		get backgroundColor() {
			return backgroundColor();
		},

		set backgroundColor($$value) {
			backgroundColor($$value);
			$.flush();
		}
	};

	var div = root();

	$.attribute_effect(div, () => ({
		...$$restProps,
		[$.STYLE]: { 'background-color': `rgb(${backgroundColor() ?? ''}, 0, 0)` }
	}));

	$.append($$anchor, div);

	return $.pop($$exports);
}