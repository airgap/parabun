import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <button>change step</button>`, 1);

export default function Main($$anchor) {
	let step = $.mutable_source("any");
	var fragment = root();
	var input = $.first_child(fragment);

	$.attribute_effect(input, () => ({ type: 'range', ...{ step: $.get(step) } }), void 0, void 0, void 0, void 0, true);

	var button = $.sibling(input, 2);

	$.delegated('click', button, () => $.set(step, $.get(step) === "any" ? 10 : "any"));
	$.append($$anchor, fragment);
}

$.delegate(['click']);