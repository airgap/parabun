import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { addCss, addedCss, applyComputations, renderMainFragment } from './module.js';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, addCss + addedCss + applyComputations + renderMainFragment);

	function compute() {
		return value().toUpperCase();
	}

	var $$exports = {
		compute,
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [() => ($.untrack(compute))]);
	$.append($$anchor, text);
	$.bind_prop($$props, 'compute', compute);

	return $.pop($$exports);
}