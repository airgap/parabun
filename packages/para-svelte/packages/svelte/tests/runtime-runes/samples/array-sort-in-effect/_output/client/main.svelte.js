import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>add item</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let arr = $.proxy([100, 0, 50]);
	let nextValues = [20, 80];
	let valueIndex = 0;

	$.user_effect(() => {
		arr.sort((a, b) => a - b);
	});

	function addItem() {
		if (valueIndex < nextValues.length) {
			arr.push(nextValues[valueIndex]);
			valueIndex++;
		}
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 17, () => arr, $.index, ($$anchor, x) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(x)));
		$.append($$anchor, p);
	});

	$.delegated('click', button, addItem);
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);