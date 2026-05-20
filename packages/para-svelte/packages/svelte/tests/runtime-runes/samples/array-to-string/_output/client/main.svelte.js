import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>add</button> <span> </span>`, 1);

export default function Main($$anchor) {
	let array = $.proxy([1, 2, 3]);

	function addToArray() {
		array.push(array.length + 1);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var span = $.sibling(button, 2);
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, array));
	$.delegated('click', button, addToArray);
	$.append($$anchor, fragment);
}

$.delegate(['click']);