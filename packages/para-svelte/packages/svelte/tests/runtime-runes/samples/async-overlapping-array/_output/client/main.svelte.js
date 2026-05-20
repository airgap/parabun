import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<button>add</button> <button>shift</button> <button>pop</button> <p> </p> <div>not keyed: <!></div> <div>keyed: <!></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let values = $.proxy([1]);
	const queue = [];

	function push(v) {
		if (v === 1) return v;

		const p = Promise.withResolvers();

		queue.push(() => p.resolve(v));

		return p.promise;
	}

	function addValue() {
		values.push(values.length + 1);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var p_1 = $.sibling(button_2, 2);
	var text = $.child(p_1);

	$.reset(p_1);

	var div = $.sibling(p_1, 2);
	var node = $.sibling($.child(div));

	$.each(node, 17, () => values, $.index, ($$anchor, v) => {
		var div_1 = root_1();
		var text_1 = $.child(div_1, true);

		$.reset(div_1);
		$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push($.get(v))]);
		$.append($$anchor, div_1);
	});

	$.reset(div);

	var div_2 = $.sibling(div, 2);
	var node_1 = $.sibling($.child(div_2));

	$.each(node_1, 16, () => values, (v) => v, ($$anchor, v) => {
		var div_3 = root_2();
		var text_2 = $.child(div_3, true);

		$.reset(div_3);
		$.template_effect(($0) => $.set_text(text_2, $0), void 0, [() => push(v)]);
		$.append($$anchor, div_3);
	});

	$.reset(div_2);

	$.template_effect(() => $.set_text(text, `pending=${$.eager($.pending) ?? ''}
	values.length=${values.length ?? ''}
	values=[${values ?? ''}]`));

	$.delegated('click', button, addValue);
	$.delegated('click', button_1, () => queue.shift()?.());
	$.delegated('click', button_2, () => queue.pop()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);