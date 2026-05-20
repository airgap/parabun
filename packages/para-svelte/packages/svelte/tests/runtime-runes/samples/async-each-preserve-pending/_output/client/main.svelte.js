import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>add</button> <button>shift</button> <!>`, 1);

export default function Main($$anchor) {
	let values = $.state($.proxy([1]));
	const queue = [];

	function push(v) {
		if (v === 1) return v;

		const p = Promise.withResolvers();

		queue.push(() => p.resolve(v));

		return p.promise;
	}

	function shift() {
		const fn = queue.shift();

		if (fn) fn();
	}

	function addValue() {
		$.set(values, [...$.get(values), $.get(values).length + 1], true);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	$.each(node, 17, () => $.get(values), $.index, ($$anchor, v) => {
		var p_1 = root_1();
		var text = $.child(p_1, true);

		$.reset(p_1);
		$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push($.get(v))]);
		$.append($$anchor, p_1);
	});

	$.delegated('click', button, addValue);
	$.delegated('click', button_1, shift);
	$.append($$anchor, fragment);
}

$.delegate(['click']);